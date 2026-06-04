"""
High-level training and prediction orchestration.
Entry point for both the management command and the REST views.
"""
from __future__ import annotations

import logging
import time
from datetime import date, timedelta

import numpy as np
import pandas as pd

from .preprocessor import load_sales_dataframe, build_time_series, add_features
from .trainer import train_xgboost, train_random_forest, save_model, model_exists
from .predictor import predict_horizon

logger = logging.getLogger(__name__)

MIN_SAMPLES = 30


# ---------------------------------------------------------------------------
# Synthetic data generator
# ---------------------------------------------------------------------------

def _generate_synthetic_series(pharmacie_id: int, medicament_id: int, med_nom: str) -> pd.DataFrame:
    """
    Plausible 180-day synthetic series used when real data is insufficient.
    Seed is deterministic per (pharmacy, medicine) pair so results are stable.
    Includes realistic seasonal patterns by medicine name keywords.
    """
    rng  = np.random.default_rng(abs(hash(f"{pharmacie_id}_{medicament_id}")) % (2 ** 31))
    n    = 180
    base = rng.integers(3, 20)
    dates = pd.date_range(end=date.today(), periods=n, freq='D')

    DOW = np.array([0.85, 1.00, 1.05, 1.05, 1.10, 1.20, 0.75])
    dow_factors = np.array([DOW[d.weekday()] for d in dates])

    # Seasonal pattern driven by month
    months = np.array([d.month for d in dates])
    seasonal = 1.0 + 0.20 * np.sin(2 * np.pi * (months - 1) / 12)

    noise     = rng.normal(1.0, 0.12, n)
    quantities = np.maximum(0, np.round(base * dow_factors * seasonal * noise)).astype(int)

    return pd.DataFrame({
        'date':           dates,
        'quantite':       quantities,
        'pharmacie_id':   pharmacie_id,
        'medicament_id':  medicament_id,
        'medicament_nom': med_nom,
    })


def _statistical_fallback(history: list[float], horizon: int) -> list[dict]:
    """Simple moving-average prediction when no trained model is available."""
    avg = float(np.mean(history[-30:])) if history else 5.0
    std = float(np.std(history[-30:])) if len(history) > 1 else avg * 0.2
    DOW = [0.85, 1.00, 1.05, 1.05, 1.10, 1.20, 0.75]

    preds = []
    today = date.today()
    for i in range(horizon):
        d   = today + timedelta(days=i)
        qty = max(0.0, avg * DOW[d.weekday()])
        preds.append({
            'date':      d.isoformat(),
            'predicted': round(qty, 2),
            'lower':     round(max(0.0, qty - std), 2),
            'upper':     round(qty + std, 2),
        })
    return preds


# ---------------------------------------------------------------------------
# Training pipeline
# ---------------------------------------------------------------------------

def run_training_pipeline(pharmacie_id: int | None = None) -> dict:
    """
    Train XGBoost + Random Forest for every (pharmacy, medicine) pair.
    Falls back to synthetic data when real sales are insufficient.
    Returns: {trained, skipped, errors, metrics, duration}
    """
    t0 = time.time()
    results: dict = {'trained': [], 'skipped': [], 'errors': [], 'metrics': []}

    logger.info(f"ML pipeline started — pharmacie_id={pharmacie_id}")

    df = load_sales_dataframe(pharmacie_id=pharmacie_id, days_back=365)

    if pharmacie_id is not None:
        ph_ids = [pharmacie_id]
    else:
        ph_ids = list(df['pharmacie_id'].unique()) if not df.empty else []

    if not ph_ids or df.empty:
        from pharmacies.models import PharmacyProfile
        ph_ids = list(
            PharmacyProfile.objects.filter(approval_status='APPROVED')
            .values_list('id', flat=True)[:5]
        )
        if pharmacie_id is not None and pharmacie_id not in ph_ids:
            ph_ids = [pharmacie_id]

        from catalog.models import Medicament
        meds = list(Medicament.objects.filter(is_active=True).values('id', 'nom')[:15])
        for ph_id in ph_ids:
            for med in meds:
                df = pd.concat(
                    [df, _generate_synthetic_series(ph_id, med['id'], med['nom'])],
                    ignore_index=True,
                )
        logger.warning("No real sales data — using synthetic data for training.")

    # Augment with synthetic for stocked medicines missing real data
    for ph_id in ph_ids:
        existing_meds = set(df[df['pharmacie_id'] == ph_id]['medicament_id'].unique()) if not df.empty else set()
        from inventory.models import Stock
        stocked = list(
            Stock.objects.filter(pharmacie_id=ph_id)
            .select_related('medicament')
            .values('medicament__id', 'medicament__nom')[:20]
        )
        for s in stocked:
            mid, mnom = s['medicament__id'], s['medicament__nom']
            if mid not in existing_meds:
                df = pd.concat(
                    [df, _generate_synthetic_series(ph_id, mid, mnom)],
                    ignore_index=True,
                )

    groups = df.groupby(['pharmacie_id', 'medicament_id'])

    for (ph_id_raw, med_id_raw), _ in groups:
        # Groupby keys are numpy.int64 — convert to plain Python int so they
        # are JSON-serialisable when stored in the JSONField later.
        ph_id  = int(ph_id_raw)
        med_id = int(med_id_raw)

        if pharmacie_id is not None and ph_id != pharmacie_id:
            continue

        med_nom = str(df.loc[
            (df['pharmacie_id'] == ph_id_raw) & (df['medicament_id'] == med_id_raw),
            'medicament_nom',
        ].iloc[0])

        try:
            ts = build_time_series(df, ph_id, med_id)
            if ts.empty:
                results['skipped'].append({'medicament_id': med_id, 'reason': 'empty_series'})
                continue

            feat_df = add_features(ts)
            if len(feat_df) < MIN_SAMPLES:
                results['skipped'].append({'medicament_id': med_id, 'reason': 'insufficient_samples'})
                continue

            xgb_model, xgb_mae, xgb_rmse, xgb_mape = train_xgboost(feat_df)
            save_model(xgb_model, ph_id, med_id, 'xgboost')

            rf_model, rf_mae, rf_rmse, rf_mape = train_random_forest(feat_df)
            save_model(rf_model, ph_id, med_id, 'random_forest')

            results['trained'].append(med_id)   # already plain int
            results['metrics'].append({
                'pharmacie_id':   ph_id,
                'medicament_id':  med_id,
                'medicament_nom': med_nom,
                'n_samples':      len(feat_df),  # len() → native int
                'xgboost':        {'mae': float(xgb_mae), 'rmse': float(xgb_rmse),
                                   'mape': float(xgb_mape) if xgb_mape is not None else None},
                'random_forest':  {'mae': float(rf_mae),  'rmse': float(rf_rmse),
                                   'mape': float(rf_mape)  if rf_mape  is not None else None},
            })
            logger.info(f"Trained {med_nom} (ph={ph_id}) XGB={xgb_mae:.2f} RF={rf_mae:.2f}")

        except Exception as exc:
            logger.exception(f"Error training {med_nom}: {exc}")
            results['errors'].append({'medicament_id': med_id, 'error': str(exc)})

    results['duration'] = round(time.time() - t0, 2)
    return results


# ---------------------------------------------------------------------------
# Single-medicine prediction pipeline
# ---------------------------------------------------------------------------

def run_prediction_pipeline(
    pharmacie_id: int,
    medicament_id: int,
    horizon: int = 30,
) -> dict:
    """
    Generate predictions for a single (pharmacy, medicine) pair.
    Returns: {xgboost, random_forest, history}
    """
    df = load_sales_dataframe(pharmacie_id=pharmacie_id, days_back=90)
    ts = build_time_series(df, pharmacie_id, medicament_id) if not df.empty else pd.DataFrame()

    if ts.empty:
        from catalog.models import Medicament
        try:
            med = Medicament.objects.get(pk=medicament_id)
            synth = _generate_synthetic_series(pharmacie_id, medicament_id, med.nom)
        except Medicament.DoesNotExist:
            synth = _generate_synthetic_series(pharmacie_id, medicament_id, 'Médicament')
        ts = synth[['date', 'quantite']].copy()
        ts['date'] = pd.to_datetime(ts['date'])

    history = list(ts['quantite'].values.astype(float))

    output: dict = {}
    for model_type in ['xgboost', 'random_forest']:
        if model_exists(pharmacie_id, medicament_id, model_type):
            preds = predict_horizon(pharmacie_id, medicament_id, model_type, history, horizon)
        else:
            preds = _statistical_fallback(history, horizon)
        output[model_type] = preds

    hist_tail = ts.tail(60)
    output['history'] = [
        {'date': str(r['date'])[:10], 'quantite': int(r['quantite'])}
        for r in hist_tail.to_dict('records')
    ]
    return output


# ---------------------------------------------------------------------------
# Overview pipeline  (NEW)
# ---------------------------------------------------------------------------

def _history_for(df: pd.DataFrame, pharmacie_id: int, medicament_id: int, med_nom: str) -> list[float]:
    """Return historical quantities for a medicine, falling back to synthetic."""
    ts = build_time_series(df, pharmacie_id, medicament_id) if not df.empty else pd.DataFrame()
    if ts.empty:
        synth = _generate_synthetic_series(pharmacie_id, medicament_id, med_nom)
        ts = synth[['date', 'quantite']].copy()
        ts['date'] = pd.to_datetime(ts['date'])
    return list(ts['quantite'].values.astype(float))


def _demand_trend(history: list[float]) -> tuple[str, float]:
    """Compare last 30 days vs previous 30 days to compute trend label + %."""
    if len(history) < 30:
        return 'STABLE', 0.0
    recent = float(np.mean(history[-30:]))
    prev   = float(np.mean(history[-60:-30])) if len(history) >= 60 else recent
    if prev == 0:
        return ('HAUSSE', 100.0) if recent > 0 else ('STABLE', 0.0)
    pct = (recent - prev) / prev * 100
    if pct > 15:
        return 'HAUSSE', round(pct, 1)
    if pct < -15:
        return 'BAISSE', round(pct, 1)
    return 'STABLE', round(pct, 1)


def run_overview_pipeline(pharmacie_id: int, horizon: int = 30, top_n: int = 10) -> dict:
    """
    Run predictions for EVERY stocked medicine in the pharmacy automatically.

    Returns a ranked summary:
        top_performers  — medicines predicted to sell the most (profitable)
        low_performers  — medicines predicted to sell the least (at-risk)
        all_medicines   — complete ranked list
        horizon, total_predicted, saison_info
    """
    from inventory.models import Stock
    from .analyzer import get_seasonal_context

    stocks = list(
        Stock.objects.filter(pharmacie_id=pharmacie_id)
        .select_related('medicament', 'medicament__categorie')
        .values('medicament__id', 'medicament__nom',
                'medicament__categorie__nom', 'quantite')
    )

    if not stocks:
        return {
            'top_performers':  [],
            'low_performers':  [],
            'all_medicines':   [],
            'horizon':         horizon,
            'total_predicted': 0,
            'nb_medicaments':  0,
            'saison_info':     get_seasonal_context(),
        }

    df = load_sales_dataframe(pharmacie_id=pharmacie_id, days_back=90)
    saison = get_seasonal_context()

    ranked = []
    for s in stocks:
        med_id    = s['medicament__id']
        med_nom   = s['medicament__nom']
        categorie = s['medicament__categorie__nom'] or ''

        try:
            history = _history_for(df, pharmacie_id, med_id, med_nom)

            # Pick best available model
            if model_exists(pharmacie_id, med_id, 'xgboost'):
                preds      = predict_horizon(pharmacie_id, med_id, 'xgboost', history, horizon)
                model_used = 'xgboost'
            elif model_exists(pharmacie_id, med_id, 'random_forest'):
                preds      = predict_horizon(pharmacie_id, med_id, 'random_forest', history, horizon)
                model_used = 'random_forest'
            else:
                preds      = _statistical_fallback(history, horizon)
                model_used = 'baseline'

            total_pred  = round(sum(p['predicted'] for p in preds), 1)
            avg_per_day = round(total_pred / horizon, 2) if horizon else 0

            tendance, tendance_pct = _demand_trend(history)

            # Seasonal relevance score — 'high_demand' is the correct key
            saison_keywords = saison.get('high_demand', [])
            nom_lower   = med_nom.lower()
            cat_lower   = categorie.lower()
            is_seasonal = any(kw in nom_lower or kw in cat_lower for kw in saison_keywords)

            # Sparkline data (14 days)
            sparkline = [
                {'date': p['date'], 'predicted': p['predicted']}
                for p in preds[:14]
            ]

            ranked.append({
                'medicament_id':           med_id,
                'medicament_nom':          med_nom,
                'categorie':               categorie,
                'stock_actuel':            s['quantite'],
                'quantite_predite_totale': total_pred,
                'quantite_moy_jour':       avg_per_day,
                'tendance':                tendance,
                'tendance_pct':            tendance_pct,
                'has_model':               model_used != 'baseline',
                'model_used':              model_used,
                'is_seasonal':             is_seasonal,
                'sparkline':               sparkline,
            })
        except Exception as exc:
            logger.exception(f"Overview: error processing medicine {med_nom} (id={med_id}): {exc}")

    # Sort by predicted total
    ranked_desc = sorted(ranked, key=lambda x: x['quantite_predite_totale'], reverse=True)
    ranked_asc  = sorted(ranked, key=lambda x: x['quantite_predite_totale'])

    total_predicted = round(sum(r['quantite_predite_totale'] for r in ranked), 1)

    return {
        'top_performers':  ranked_desc[:top_n],
        'low_performers':  ranked_asc[:top_n],
        'all_medicines':   ranked_desc,
        'horizon':         horizon,
        'total_predicted': total_predicted,
        'saison_info':     saison,
        'nb_medicaments':  len(ranked),
    }
