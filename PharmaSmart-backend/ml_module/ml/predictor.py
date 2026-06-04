"""
Prediction engine: recursive multi-step forecasting using trained models.
"""
from __future__ import annotations

from datetime import date, timedelta

import numpy as np
import pandas as pd

from .preprocessor import FEATURE_COLS, is_holiday
from .trainer import load_model, model_exists


def _build_future_row(target_date: date, history: list[float], step_idx: int) -> list[float]:
    """
    Build the feature vector for a single future date using the rolling history.
    Returns values in the same order as FEATURE_COLS.
    """
    d = pd.Timestamp(target_date)

    def lag(n: int) -> float:
        idx = len(history) - n
        return float(history[idx]) if idx >= 0 else 0.0

    recent30 = history[-30:] if len(history) >= 30 else history
    recent14 = history[-14:] if len(history) >= 14 else history
    recent7  = history[-7:]  if len(history) >= 7  else history

    return [
        d.dayofweek,                                             # day_of_week
        d.month,                                                 # month
        d.quarter,                                               # quarter
        d.dayofyear,                                             # day_of_year
        d.isocalendar()[1],                                      # week_of_year
        int(d.dayofweek >= 5),                                   # is_weekend
        int(is_holiday(target_date)),                            # is_holiday
        float(step_idx),                                         # trend
        lag(1), lag(7), lag(14), lag(21), lag(30),               # lag_*
        float(np.mean(recent7)),                                 # rolling_mean_7
        float(np.mean(recent14)),                                # rolling_mean_14
        float(np.mean(recent30)),                                # rolling_mean_30
        float(np.std(recent7))  if len(recent7)  > 1 else 0.0,  # rolling_std_7
        float(np.std(recent30)) if len(recent30) > 1 else 0.0,  # rolling_std_30
    ]


def predict_horizon(
    pharmacie_id: int,
    medicament_id: int,
    model_type: str,
    history_series: list[float],
    horizon: int = 30,
    start_date: date | None = None,
) -> list[dict]:
    """
    Recursively predict `horizon` future daily quantities.

    Returns list of dicts: {date, predicted, lower, upper}
    """
    model = load_model(pharmacie_id, medicament_id, model_type)
    if model is None:
        return []

    if start_date is None:
        start_date = date.today()

    rolling = list(history_series[-60:])
    predictions: list[dict] = []

    for step in range(horizon):
        target = start_date + timedelta(days=step)
        row = _build_future_row(target, rolling, step)
        qty = max(0.0, float(model.predict(np.array([row]))[0]))

        recent = rolling[-14:] if len(rolling) >= 14 else rolling
        std = float(np.std(recent)) if len(recent) > 1 else qty * 0.2

        predictions.append({
            'date':      target.isoformat(),
            'predicted': round(qty, 2),
            'lower':     round(max(0.0, qty - std), 2),
            'upper':     round(qty + std, 2),
        })
        rolling.append(qty)

    return predictions


def get_feature_importances(
    pharmacie_id: int,
    medicament_id: int,
    model_type: str,
) -> list[dict]:
    """
    Return feature importances sorted descending.
    Works for XGBoost and Random Forest (both expose feature_importances_).
    """
    model = load_model(pharmacie_id, medicament_id, model_type)
    if model is None or not hasattr(model, 'feature_importances_'):
        return []

    pairs = zip(FEATURE_COLS, model.feature_importances_)
    return [
        {'feature': feat, 'importance': round(float(imp), 4)}
        for feat, imp in sorted(pairs, key=lambda x: x[1], reverse=True)
    ]
