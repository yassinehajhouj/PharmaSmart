"""
Pydantic schemas for FastAPI request / response models.
"""

from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class ForecastRequest(BaseModel):
    medicine: str = Field(..., description="Medicine name (must match training data)")
    horizon: int  = Field(30, ge=1, le=365, description="Number of days to forecast")
    model: Literal["prophet", "xgboost", "both"] = Field(
        "both", description="Which model to use"
    )


class TrainRequest(BaseModel):
    evaluate: bool = Field(True, description="Run evaluation after training")
    test_days: int = Field(30, ge=7, le=90, description="Hold-out size for evaluation")


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class DailyForecast(BaseModel):
    date: date
    predicted_quantity: float
    lower_bound: float | None = None
    upper_bound: float | None = None
    model: str


class ForecastResponse(BaseModel):
    medicine: str
    horizon_days: int
    forecasts: list[DailyForecast]


class MetricRow(BaseModel):
    medicine: str
    model: str
    MAE: float
    RMSE: float
    MAPE: float


class ComparisonResponse(BaseModel):
    metrics: list[MetricRow]
    best_models: list[MetricRow]


class MedicineListResponse(BaseModel):
    medicines: list[str]
    count: int


class TrainResponse(BaseModel):
    status: str
    medicines_trained: list[str]
    comparison: ComparisonResponse | None = None


class HealthResponse(BaseModel):
    status: str
    models_loaded: list[str]
    data_rows: int
