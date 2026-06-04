"""
Model evaluation and comparison utilities.

Computes MAE, RMSE, and MAPE for both Prophet and XGBoost on a held-out
test period (last N days of the historical data).
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error


# ---------------------------------------------------------------------------
# Metric helpers
# ---------------------------------------------------------------------------

def _mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Mean Absolute Percentage Error, skipping zero-valued actuals."""
    mask = y_true != 0
    if not mask.any():
        return float("nan")
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100)


def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float).clip(min=0)
    return {
        "MAE":  round(float(mean_absolute_error(y_true, y_pred)), 3),
        "RMSE": round(float(np.sqrt(mean_squared_error(y_true, y_pred))), 3),
        "MAPE": round(_mape(y_true, y_pred), 3),
    }


# ---------------------------------------------------------------------------
# Train / test split
# ---------------------------------------------------------------------------

def time_series_split(
    df: pd.DataFrame,
    medicine: str,
    test_days: int = 30,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Split a single medicine's data into train / test by date.

    Returns:
        (train_df, test_df) – both contain all original columns.
    """
    med_df = df[df["medicine"] == medicine].sort_values("date")
    cutoff = med_df["date"].max() - pd.Timedelta(days=test_days)
    train = med_df[med_df["date"] <= cutoff].copy()
    test  = med_df[med_df["date"] >  cutoff].copy()
    return train, test


# ---------------------------------------------------------------------------
# Evaluation runner
# ---------------------------------------------------------------------------

def evaluate_prophet(
    prophet_forecaster,
    df: pd.DataFrame,
    medicine: str,
    test_days: int = 30,
) -> dict[str, float]:
    """
    Evaluate Prophet on the held-out test period.

    We re-train on train split, then predict *test_days* ahead and
    align predictions with the actual test values.
    """
    from .prophet_model import ProphetForecaster
    from .preprocessor import to_prophet_df

    train_df, test_df = time_series_split(df, medicine, test_days)

    # Re-train on train only
    tmp = ProphetForecaster(model_dir="/tmp/eval_prophet")
    tmp.fit(train_df, medicine)

    forecast = tmp.predict(medicine, horizon=test_days)
    # Align by date
    merged = test_df.merge(
        forecast[["ds", "yhat"]].rename(columns={"ds": "date"}),
        on="date",
    )
    if merged.empty:
        return {"MAE": float("nan"), "RMSE": float("nan"), "MAPE": float("nan")}

    return compute_metrics(merged["quantity_sold"].values, merged["yhat"].values)


def evaluate_xgboost(
    xgb_forecaster,
    df: pd.DataFrame,
    medicine: str,
    test_days: int = 30,
) -> dict[str, float]:
    """
    Evaluate XGBoost on the held-out test period using recursive forecasting.
    """
    from .xgboost_model import XGBoostForecaster

    train_df, test_df = time_series_split(df, medicine, test_days)

    tmp = XGBoostForecaster(model_dir="/tmp/eval_xgboost")
    tmp.fit(train_df, medicine)

    forecast = tmp.predict(train_df, medicine, horizon=test_days)
    merged = test_df.merge(
        forecast[["ds", "yhat"]].rename(columns={"ds": "date"}),
        on="date",
    )
    if merged.empty:
        return {"MAE": float("nan"), "RMSE": float("nan"), "MAPE": float("nan")}

    return compute_metrics(merged["quantity_sold"].values, merged["yhat"].values)


def compare_models(
    df: pd.DataFrame,
    prophet_forecaster=None,
    xgb_forecaster=None,
    test_days: int = 30,
) -> pd.DataFrame:
    """
    Evaluate both models on every medicine and return a comparison table.

    Returns a DataFrame with columns:
        medicine, model, MAE, RMSE, MAPE
    """
    medicines = df["medicine"].unique()
    rows = []

    for med in medicines:
        print(f"  Evaluating '{med}' …", end=" ")

        p_metrics = evaluate_prophet(prophet_forecaster, df, med, test_days)
        x_metrics = evaluate_xgboost(xgb_forecaster, df, med, test_days)

        rows.append({"medicine": med, "model": "Prophet",  **p_metrics})
        rows.append({"medicine": med, "model": "XGBoost",  **x_metrics})
        print(
            f"Prophet MAE={p_metrics['MAE']:.1f}  "
            f"XGBoost MAE={x_metrics['MAE']:.1f}"
        )

    comparison = pd.DataFrame(rows)
    return comparison


def best_model_per_medicine(comparison: pd.DataFrame) -> pd.DataFrame:
    """
    Given the comparison table, return the better model (lower RMSE) for each
    medicine.
    """
    idx = comparison.groupby("medicine")["RMSE"].idxmin()
    return comparison.loc[idx].reset_index(drop=True)
