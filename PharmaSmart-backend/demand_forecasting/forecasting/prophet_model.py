"""
Prophet demand forecasting model.

Wraps Meta's Prophet library with:
  - Moroccan public holidays
  - Weekly + yearly seasonality
  - Per-medicine model persistence (joblib)
"""

from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd
from prophet import Prophet

from .preprocessor import to_prophet_df

# Prophet is verbose by default; suppress its Stan output
import logging
logging.getLogger("prophet").setLevel(logging.WARNING)
logging.getLogger("cmdstanpy").setLevel(logging.WARNING)


# ---------------------------------------------------------------------------
# Moroccan holidays in the format Prophet expects
# ---------------------------------------------------------------------------

def _build_moroccan_holidays() -> pd.DataFrame:
    years = list(range(2020, 2028))
    entries = []
    holiday_defs = [
        ("Nouvel An",                     1,  1),
        ("Manifeste de l'Indépendance",   1, 11),
        ("Fête du Travail",               5,  1),
        ("Fête du Trône",                 7, 30),
        ("Allégeance Oued Eddahab",       8, 14),
        ("Révolution du Roi",             8, 20),
        ("Fête de la Jeunesse",           8, 21),
        ("Marche Verte",                 11,  6),
        ("Fête de l'Indépendance",       11, 18),
    ]
    for year in years:
        for name, month, day in holiday_defs:
            entries.append({"holiday": name, "ds": pd.Timestamp(year, month, day)})
    return pd.DataFrame(entries)


MOROCCAN_HOLIDAYS = _build_moroccan_holidays()


# ---------------------------------------------------------------------------
# ProphetForecaster
# ---------------------------------------------------------------------------

class ProphetForecaster:
    """
    Fits one Prophet model per medicine and generates multi-step forecasts.

    Usage:
        forecaster = ProphetForecaster()
        forecaster.fit(df, medicine="Paracetamol")
        forecast = forecaster.predict(medicine="Paracetamol", horizon=30)
    """

    def __init__(self, model_dir: str | Path = "saved_models/prophet"):
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)
        self._models: dict[str, Prophet] = {}

    # ------------------------------------------------------------------
    # Training
    # ------------------------------------------------------------------

    def _build_model(self) -> Prophet:
        model = Prophet(
            holidays=MOROCCAN_HOLIDAYS,
            yearly_seasonality=True,
            weekly_seasonality=True,
            daily_seasonality=False,
            seasonality_mode="multiplicative",   # better for demand that scales with level
            changepoint_prior_scale=0.05,        # regularise trend changes
            holidays_prior_scale=10.0,
            interval_width=0.90,                 # 90 % confidence interval
        )
        return model

    def fit(self, df: pd.DataFrame, medicine: str) -> "ProphetForecaster":
        """Fit Prophet on historical data for one medicine."""
        prophet_df = to_prophet_df(df, medicine)
        if len(prophet_df) < 30:
            raise ValueError(
                f"Not enough data for '{medicine}': need ≥ 30 rows, got {len(prophet_df)}."
            )

        model = self._build_model()
        model.fit(prophet_df)
        self._models[medicine] = model
        print(f"[Prophet] Trained model for '{medicine}'  ({len(prophet_df)} days of history)")
        return self

    def fit_all(self, df: pd.DataFrame) -> "ProphetForecaster":
        """Fit Prophet models for every medicine found in the DataFrame."""
        for med in df["medicine"].unique():
            self.fit(df, med)
        return self

    # ------------------------------------------------------------------
    # Inference
    # ------------------------------------------------------------------

    def predict(self, medicine: str, horizon: int = 30) -> pd.DataFrame:
        """
        Generate a forecast for the next *horizon* days.

        Returns a DataFrame with columns:
            ds, yhat, yhat_lower, yhat_upper
        """
        model = self._get_model(medicine)
        future = model.make_future_dataframe(periods=horizon, freq="D")
        forecast = model.predict(future)

        result = forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]].tail(horizon).copy()
        result["yhat"]       = result["yhat"].clip(lower=0).round(1)
        result["yhat_lower"] = result["yhat_lower"].clip(lower=0).round(1)
        result["yhat_upper"] = result["yhat_upper"].clip(lower=0).round(1)
        result["medicine"]   = medicine
        result["model"]      = "Prophet"
        return result.reset_index(drop=True)

    def predict_in_sample(self, df: pd.DataFrame, medicine: str) -> pd.DataFrame:
        """Return fitted values on the training set (for evaluation)."""
        model = self._get_model(medicine)
        prophet_df = to_prophet_df(df, medicine)
        forecast = model.predict(prophet_df[["ds"]])
        out = prophet_df.merge(
            forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]], on="ds"
        )
        out["yhat"] = out["yhat"].clip(lower=0)
        return out

    # ------------------------------------------------------------------
    # Persistence
    # ------------------------------------------------------------------

    def save(self, medicine: str) -> Path:
        """Serialize the fitted model to disk."""
        model = self._get_model(medicine)
        path = self.model_dir / f"prophet_{medicine}.joblib"
        joblib.dump(model, path)
        print(f"[Prophet] Saved model → {path}")
        return path

    def save_all(self) -> None:
        for med in list(self._models):
            self.save(med)

    def load(self, medicine: str) -> "ProphetForecaster":
        """Load a previously persisted model."""
        path = self.model_dir / f"prophet_{medicine}.joblib"
        if not path.exists():
            raise FileNotFoundError(f"No saved Prophet model at {path}")
        self._models[medicine] = joblib.load(path)
        return self

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _get_model(self, medicine: str) -> Prophet:
        if medicine not in self._models:
            # Try loading from disk before raising
            try:
                self.load(medicine)
            except FileNotFoundError:
                raise KeyError(
                    f"No Prophet model found for '{medicine}'. "
                    "Call fit() or load() first."
                )
        return self._models[medicine]

    @property
    def trained_medicines(self) -> list[str]:
        return list(self._models.keys())
