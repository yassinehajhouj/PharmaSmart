"""
FastAPI route definitions for the demand forecasting service.

Endpoints:
  GET  /health                  – liveness check + model status
  GET  /medicines               – list available medicines
  POST /forecast                – get forecast (Prophet / XGBoost / both)
  GET  /forecast/{medicine}     – convenience GET for 30-day forecast (both models)
  POST /train                   – retrain all models
  GET  /compare                 – last model comparison metrics
  GET  /feature-importance/{m}  – XGBoost feature importances
"""

from __future__ import annotations

import threading
from functools import lru_cache
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, BackgroundTasks, HTTPException, status

from .schemas import (
    ComparisonResponse,
    DailyForecast,
    ForecastRequest,
    ForecastResponse,
    HealthResponse,
    MedicineListResponse,
    MetricRow,
    TrainRequest,
    TrainResponse,
)
from forecasting.pipeline import DATA_PATH, MODEL_DIR, load_trained_models, run_pipeline
from forecasting.evaluator import compare_models, best_model_per_medicine

router = APIRouter()

# ---------------------------------------------------------------------------
# Global application state (models loaded once at startup)
# ---------------------------------------------------------------------------

_state: dict = {
    "prophet": None,
    "xgboost": None,
    "df": None,
    "comparison": None,
    "training_lock": threading.Lock(),
    "is_training": False,
}


def get_state() -> dict:
    return _state


def _ensure_models_loaded() -> None:
    """Lazy-load models on first request if not already in memory."""
    if _state["prophet"] is None or _state["xgboost"] is None:
        try:
            prophet, xgb, df = load_trained_models()
            _state["prophet"] = prophet
            _state["xgboost"] = xgb
            _state["df"] = df
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=(
                    f"Models not available: {exc}. "
                    "POST /train to train them first."
                ),
            )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@router.get("/health", response_model=HealthResponse, tags=["System"])
def health() -> HealthResponse:
    """Liveness check – returns which medicines have trained models loaded."""
    p = _state["prophet"]
    x = _state["xgboost"]
    loaded = []
    if p:
        loaded += [f"prophet:{m}" for m in p.trained_medicines]
    if x:
        loaded += [f"xgboost:{m}" for m in x.trained_medicines]
    df = _state["df"]
    return HealthResponse(
        status="ok",
        models_loaded=loaded,
        data_rows=len(df) if df is not None else 0,
    )


@router.get("/medicines", response_model=MedicineListResponse, tags=["Data"])
def list_medicines() -> MedicineListResponse:
    """Return the list of medicines available in the training dataset."""
    _ensure_models_loaded()
    medicines = sorted(_state["df"]["medicine"].unique().tolist())
    return MedicineListResponse(medicines=medicines, count=len(medicines))


@router.post("/forecast", response_model=ForecastResponse, tags=["Forecast"])
def forecast(req: ForecastRequest) -> ForecastResponse:
    """
    Generate a demand forecast for one medicine.

    - **model** can be `"prophet"`, `"xgboost"`, or `"both"` (returns forecasts
      from both models merged into a single list).
    - **horizon** is in days (1–365).
    """
    _ensure_models_loaded()
    medicine = req.medicine
    df = _state["df"]

    if medicine not in df["medicine"].unique():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Medicine '{medicine}' not found. "
                   f"Available: {sorted(df['medicine'].unique().tolist())}",
        )

    daily_forecasts: list[DailyForecast] = []

    if req.model in ("prophet", "both"):
        try:
            p_fc = _state["prophet"].predict(medicine, horizon=req.horizon)
            for _, row in p_fc.iterrows():
                daily_forecasts.append(
                    DailyForecast(
                        date=row["ds"].date(),
                        predicted_quantity=row["yhat"],
                        lower_bound=row.get("yhat_lower"),
                        upper_bound=row.get("yhat_upper"),
                        model="Prophet",
                    )
                )
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Prophet error: {exc}")

    if req.model in ("xgboost", "both"):
        try:
            x_fc = _state["xgboost"].predict(df, medicine, horizon=req.horizon)
            for _, row in x_fc.iterrows():
                daily_forecasts.append(
                    DailyForecast(
                        date=row["ds"].date(),
                        predicted_quantity=row["yhat"],
                        lower_bound=None,
                        upper_bound=None,
                        model="XGBoost",
                    )
                )
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"XGBoost error: {exc}")

    return ForecastResponse(
        medicine=medicine,
        horizon_days=req.horizon,
        forecasts=daily_forecasts,
    )


@router.get("/forecast/{medicine}", response_model=ForecastResponse, tags=["Forecast"])
def forecast_get(medicine: str, horizon: int = 30) -> ForecastResponse:
    """Convenience GET endpoint – equivalent to POST /forecast with model='both'."""
    return forecast(ForecastRequest(medicine=medicine, horizon=horizon, model="both"))


@router.post("/train", response_model=TrainResponse, tags=["Training"])
def train(req: TrainRequest, background_tasks: BackgroundTasks) -> TrainResponse:
    """
    Retrain all models.  Training runs synchronously (may take a few minutes).
    """
    if _state["is_training"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Training already in progress.",
        )

    _state["is_training"] = True
    try:
        result = run_pipeline(evaluate=req.evaluate, test_days=req.test_days)
        _state["prophet"]  = result["prophet"]
        _state["xgboost"]  = result["xgboost"]
        _state["df"]       = result["df"]
        _state["comparison"] = result.get("comparison")
    finally:
        _state["is_training"] = False

    comparison_resp = None
    if req.evaluate and "comparison" in result:
        comp_df = result["comparison"]
        best_df = result["best_models"]
        comparison_resp = ComparisonResponse(
            metrics=[MetricRow(**r) for r in comp_df.to_dict("records")],
            best_models=[MetricRow(**r) for r in best_df.to_dict("records")],
        )

    return TrainResponse(
        status="trained",
        medicines_trained=_state["prophet"].trained_medicines,
        comparison=comparison_resp,
    )


@router.get("/compare", response_model=ComparisonResponse, tags=["Evaluation"])
def compare() -> ComparisonResponse:
    """
    Return the most recent model comparison metrics.
    Trigger POST /train first if no comparison is available.
    """
    _ensure_models_loaded()
    if _state["comparison"] is None:
        # Compute on the fly
        comp = compare_models(
            _state["df"], _state["prophet"], _state["xgboost"], test_days=30
        )
        _state["comparison"] = comp

    comp_df = _state["comparison"]
    best_df = best_model_per_medicine(comp_df)
    return ComparisonResponse(
        metrics=[MetricRow(**r) for r in comp_df.to_dict("records")],
        best_models=[MetricRow(**r) for r in best_df.to_dict("records")],
    )


@router.get("/feature-importance/{medicine}", tags=["Evaluation"])
def feature_importance(medicine: str) -> dict:
    """Return XGBoost feature importances for one medicine."""
    _ensure_models_loaded()
    df = _state["df"]
    if medicine not in df["medicine"].unique():
        raise HTTPException(status_code=404, detail=f"Medicine '{medicine}' not found.")

    try:
        importance_df = _state["xgboost"].feature_importance(medicine)
        return {
            "medicine": medicine,
            "features": importance_df.to_dict("records"),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
