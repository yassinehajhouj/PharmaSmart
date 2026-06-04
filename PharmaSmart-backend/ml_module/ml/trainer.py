"""
Model training: XGBoost, Random Forest, and Prophet.
Handles persistence (save/load) via joblib and Prophet's JSON serialiser.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
from xgboost import XGBRegressor

from .preprocessor import FEATURE_COLS

logger = logging.getLogger(__name__)

# ── directory helpers ─────────────────────────────────────────────────────────

def _models_dir() -> Path:
    from django.conf import settings
    path = Path(getattr(settings, 'ML_MODELS_DIR', Path(__file__).resolve().parent.parent / 'saved_models'))
    path.mkdir(parents=True, exist_ok=True)
    return path


def _model_path(pharmacie_id: int, medicament_id: int, model_type: str) -> Path:
    return _models_dir() / f"{model_type}_ph{pharmacie_id}_med{medicament_id}.joblib"


def _prophet_path(pharmacie_id: int, medicament_id: int) -> Path:
    return _models_dir() / f"prophet_ph{pharmacie_id}_med{medicament_id}.json"

# ── metrics ───────────────────────────────────────────────────────────────────

def _compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> tuple[float, float, float | None]:
    mae  = float(mean_absolute_error(y_true, y_pred))
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    mask = y_true != 0
    mape = float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100) if mask.any() else None
    return mae, rmse, mape

# ── XGBoost ───────────────────────────────────────────────────────────────────

def train_xgboost(df_features) -> tuple:
    X = df_features[FEATURE_COLS].values.astype(float)
    y = df_features['quantite'].values.astype(float)

    split = max(1, int(len(X) * 0.8))
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    model = XGBRegressor(
        n_estimators=300, max_depth=5, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8,
        reg_alpha=0.1, reg_lambda=1.0,
        random_state=42, n_jobs=-1, verbosity=0, eval_metric='rmse',
    )
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    preds = np.maximum(0.0, model.predict(X_test))
    mae, rmse, mape = _compute_metrics(y_test, preds)
    logger.debug(f"XGBoost — MAE={mae:.2f}  RMSE={rmse:.2f}")
    return model, mae, rmse, mape

# ── Random Forest ─────────────────────────────────────────────────────────────

def train_random_forest(df_features) -> tuple:
    X = df_features[FEATURE_COLS].values.astype(float)
    y = df_features['quantite'].values.astype(float)

    split = max(1, int(len(X) * 0.8))
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    model = RandomForestRegressor(
        n_estimators=200, max_depth=10, min_samples_leaf=2,
        random_state=42, n_jobs=-1,
    )
    model.fit(X_train, y_train)

    preds = np.maximum(0.0, model.predict(X_test))
    mae, rmse, mape = _compute_metrics(y_test, preds)
    logger.debug(f"RandomForest — MAE={mae:.2f}  RMSE={rmse:.2f}")
    return model, mae, rmse, mape

# ── Prophet ───────────────────────────────────────────────────────────────────

def _build_moroccan_holidays(years: list[int]):
    import pandas as pd
    HOLIDAYS = [(1,1),(1,11),(5,1),(7,30),(8,14),(8,20),(8,21),(11,6),(11,18)]
    dates = [f'{y}-{m:02d}-{d:02d}' for y in years for m, d in HOLIDAYS]
    return pd.DataFrame({
        'holiday':      'ferie_maroc',
        'ds':           pd.to_datetime(dates),
        'lower_window': 0,
        'upper_window': 1,
    })


def train_prophet(ts_df) -> tuple:
    """
    Fit a Prophet model on a daily time-series DataFrame (columns: date, quantite).
    Returns (model, mae, rmse, mape).
    """
    import pandas as pd
    from prophet import Prophet

    df = ts_df.copy()
    df['ds'] = pd.to_datetime(df['date'])
    df['y']  = df['quantite'].clip(lower=0).astype(float)
    df = df[['ds', 'y']].sort_values('ds').reset_index(drop=True)

    years = sorted(df['ds'].dt.year.unique().tolist())
    years += [max(years) + 1]
    holidays = _build_moroccan_holidays(years)

    mode = 'multiplicative' if df['y'].mean() > 0 else 'additive'
    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,
        holidays=holidays,
        interval_width=0.90,
        seasonality_mode=mode,
    )

    n     = len(df)
    split = max(10, int(n * 0.8))
    model.fit(df.iloc[:split])

    future   = model.make_future_dataframe(periods=n - split, include_history=False)
    forecast = model.predict(future)

    test_actual = df['y'].values[split:]
    test_preds  = np.maximum(0.0, forecast['yhat'].values[: len(test_actual)])

    if len(test_actual) == 0:
        return model, 0.0, 0.0, None

    mae, rmse, mape = _compute_metrics(test_actual, test_preds)
    logger.debug(f"Prophet — MAE={mae:.2f}  RMSE={rmse:.2f}")
    return model, mae, rmse, mape


def save_prophet_model(model, pharmacie_id: int, medicament_id: int) -> bool:
    try:
        from prophet.serialize import model_to_json
        path = _prophet_path(pharmacie_id, medicament_id)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(model_to_json(model), f)
        return True
    except Exception as exc:
        logger.error(f"Cannot save Prophet model: {exc}")
        return False


def load_prophet_model(pharmacie_id: int, medicament_id: int):
    try:
        from prophet.serialize import model_from_json
        path = _prophet_path(pharmacie_id, medicament_id)
        if not path.exists():
            return None
        with open(path, 'r', encoding='utf-8') as f:
            return model_from_json(json.load(f))
    except Exception as exc:
        logger.error(f"Cannot load Prophet model: {exc}")
        return None


def prophet_model_exists(pharmacie_id: int, medicament_id: int) -> bool:
    return _prophet_path(pharmacie_id, medicament_id).exists()

# ── XGBoost / RF persistence ──────────────────────────────────────────────────

def save_model(model, pharmacie_id: int, medicament_id: int, model_type: str) -> str:
    path = _model_path(pharmacie_id, medicament_id, model_type)
    joblib.dump(model, path)
    return str(path)


def load_model(pharmacie_id: int, medicament_id: int, model_type: str):
    path = _model_path(pharmacie_id, medicament_id, model_type)
    return joblib.load(path) if path.exists() else None


def model_exists(pharmacie_id: int, medicament_id: int, model_type: str) -> bool:
    return _model_path(pharmacie_id, medicament_id, model_type).exists()


def list_trained_medicines(pharmacie_id: int) -> list[int]:
    pattern = f"*_ph{pharmacie_id}_med*.joblib"
    med_ids: set[int] = set()
    for p in _models_dir().glob(pattern):
        try:
            med_ids.add(int(p.stem.split('_med')[1]))
        except (IndexError, ValueError):
            pass
    return sorted(med_ids)
