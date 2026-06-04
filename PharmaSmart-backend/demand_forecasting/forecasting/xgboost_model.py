"""
XGBoost demand forecasting model.

Strategy: train one XGBRegressor per medicine using engineered features
(calendar, lags, rolling stats).  Forecasting beyond the training window
uses an iterative (recursive) strategy: the predicted value at step t is
fed back as a lag feature for step t+1.
"""

from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from xgboost import XGBRegressor

from .preprocessor import (
    FEATURE_COLS,
    add_calendar_features,
    add_lag_features,
    add_rolling_features,
    build_xgboost_features,
)


class XGBoostForecaster:
    """
    Fits one XGBRegressor per medicine and generates multi-step forecasts.

    Usage:
        forecaster = XGBoostForecaster()
        forecaster.fit(df, medicine="Paracetamol")
        forecast = forecaster.predict(df, medicine="Paracetamol", horizon=30)
    """

    # Default hyper-parameters (solid baseline; tune with CV for production)
    DEFAULT_PARAMS: dict = {
        "n_estimators": 500,
        "learning_rate": 0.05,
        "max_depth": 6,
        "subsample": 0.8,
        "colsample_bytree": 0.8,
        "reg_alpha": 0.1,
        "reg_lambda": 1.0,
        "objective": "reg:squarederror",
        "random_state": 42,
        "n_jobs": -1,
    }

    def __init__(
        self,
        model_dir: str | Path = "saved_models/xgboost",
        params: dict | None = None,
    ):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)
        self.params = {**self.DEFAULT_PARAMS, **(params or {})}
        self._models: dict[str, XGBRegressor] = {}
        # Store the raw training history per medicine for recursive inference
        self._history: dict[str, pd.Series] = {}

    # ------------------------------------------------------------------
    # Training
    # ------------------------------------------------------------------

    def fit(self, df: pd.DataFrame, medicine: str) -> "XGBoostForecaster":
        """Fit XGBoost on engineered features for one medicine."""
        feat_df = build_xgboost_features(df, medicine)
        if len(feat_df) < 60:
            raise ValueError(
                f"Not enough data for '{medicine}': need ≥ 60 rows after feature "
                f"engineering, got {len(feat_df)}."
            )

        available = [c for c in FEATURE_COLS if c in feat_df.columns]
        X = feat_df[available]
        y = feat_df["quantity_sold"]

        model = XGBRegressor(**self.params)
        model.fit(X, y, verbose=False)

        self._models[medicine] = model
        # Keep the full quantity series for recursive forecasting
        med_series = (
            df[df["medicine"] == medicine]
            .sort_values("date")
            .set_index("date")["quantity_sold"]
        )
        self._history[medicine] = med_series
        print(
            f"[XGBoost] Trained model for '{medicine}'  "
            f"({len(feat_df)} training samples, {len(available)} features)"
        )
        return self

    def fit_all(self, df: pd.DataFrame) -> "XGBoostForecaster":
        for med in df["medicine"].unique():
            self.fit(df, med)
        return self

    # ------------------------------------------------------------------
    # Inference
    # ------------------------------------------------------------------

    def predict(
        self,
        df: pd.DataFrame,
        medicine: str,
        horizon: int = 30,
    ) -> pd.DataFrame:
        """
        Generate a *horizon*-day ahead forecast using recursive prediction.

        At each step the model predicts day t, then appends the prediction
        to the rolling history before computing features for day t+1.
        """
        model = self._get_model(medicine)

        # Start from a copy of the historical series
        history = self._history[medicine].copy()
        last_date = history.index.max()

        predictions = []
        for step in range(1, horizon + 1):
            next_date = last_date + pd.Timedelta(days=step)
            row = self._build_single_row_features(history, next_date)
            available = [c for c in FEATURE_COLS if c in row.index]
            X = row[available].values.reshape(1, -1)
            yhat = float(model.predict(X)[0])
            yhat = max(0.0, round(yhat, 1))
            predictions.append(
                {"ds": next_date, "yhat": yhat, "medicine": medicine, "model": "XGBoost"}
            )
            # Feed prediction back into history for subsequent steps
            history[next_date] = yhat

        return pd.DataFrame(predictions)

    def predict_in_sample(self, df: pd.DataFrame, medicine: str) -> pd.DataFrame:
        """Return fitted values on the training set (for evaluation)."""
        model = self._get_model(medicine)
        feat_df = build_xgboost_features(df, medicine)
        available = [c for c in FEATURE_COLS if c in feat_df.columns]
        X = feat_df[available]
        feat_df = feat_df.copy()
        feat_df["yhat"] = model.predict(X).clip(min=0)
        return feat_df[["date", "quantity_sold", "yhat"]].rename(
            columns={"date": "ds", "quantity_sold": "y"}
        )

    def feature_importance(self, medicine: str) -> pd.DataFrame:
        """Return feature importances sorted descending."""
        model = self._get_model(medicine)
        history = self._history[medicine]
        available = [c for c in FEATURE_COLS if c in model.feature_names_in_]
        importance = pd.DataFrame(
            {"feature": available, "importance": model.feature_importances_}
        ).sort_values("importance", ascending=False)
        return importance

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def save(self, medicine: str) -> Path:
        payload = {
            "model": self._models[medicine],
            "history": self._history[medicine],
        }
        path = self.model_dir / f"xgboost_{medicine}.joblib"
        joblib.dump(payload, path)
        print(f"[XGBoost] Saved model → {path}")
        return path

    def save_all(self) -> None:
        for med in list(self._models):
            self.save(med)

    def load(self, medicine: str) -> "XGBoostForecaster":
        path = self.model_dir / f"xgboost_{medicine}.joblib"
        if not path.exists():
            raise FileNotFoundError(f"No saved XGBoost model at {path}")
        payload = joblib.load(path)
        self._models[medicine] = payload["model"]
        self._history[medicine] = payload["history"]
        return self

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _get_model(self, medicine: str) -> XGBRegressor:
        if medicine not in self._models:
            try:
                self.load(medicine)
            except FileNotFoundError:
                raise KeyError(
                    f"No XGBoost model found for '{medicine}'. "
                    "Call fit() or load() first."
                )
        return self._models[medicine]

    @staticmethod
    def _build_single_row_features(history: pd.Series, date: pd.Timestamp) -> pd.Series:
        """
        Build feature vector for a single future date given the rolling history.
        """
        row: dict[str, float] = {}

        # Calendar features
        row["dayofweek"]     = date.dayofweek
        row["dayofmonth"]    = date.day
        row["month"]         = date.month
        row["quarter"]       = date.quarter
        row["year"]          = date.year
        row["weekofyear"]    = int(date.isocalendar()[1])
        row["is_weekend"]    = int(date.dayofweek >= 5)
        row["is_month_start"] = int(date.is_month_start)
        row["is_month_end"]   = int(date.is_month_end)

        from .preprocessor import HOLIDAYS_MOROCCO
        row["is_holiday"] = int((date.month, date.day) in HOLIDAYS_MOROCCO)

        # Lag features
        for lag in [1, 7, 14, 30]:
            lag_date = date - pd.Timedelta(days=lag)
            row[f"lag_{lag}"] = float(history.get(lag_date, np.nan))

        # Rolling statistics (using available past data)
        past_7  = history[history.index < date].tail(7)
        past_30 = history[history.index < date].tail(30)
        row["rolling_mean_7"]  = float(past_7.mean())  if len(past_7)  > 0 else np.nan
        row["rolling_std_7"]   = float(past_7.std())   if len(past_7)  > 1 else 0.0
        row["rolling_mean_30"] = float(past_30.mean()) if len(past_30) > 0 else np.nan
        row["rolling_std_30"]  = float(past_30.std())  if len(past_30) > 1 else 0.0

        return pd.Series(row)

    @property
    def trained_medicines(self) -> list[str]:
        return list(self._models.keys())
