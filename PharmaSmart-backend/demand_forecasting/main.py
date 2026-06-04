"""
PharmaSmart – Demand Forecasting Microservice
=============================================

Entry point for the FastAPI application.

Run with:
    uvicorn main:app --reload --port 8001

The service automatically attempts to load pre-trained models at startup.
If no models exist yet, call POST /train to generate and persist them.
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router, _state
from forecasting.pipeline import load_trained_models

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
)
logger = logging.getLogger("pharmasmart.forecasting")


# ---------------------------------------------------------------------------
# Lifespan: load models once at startup
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting PharmaSmart Forecasting Service …")
    try:
        prophet, xgb, df = load_trained_models()
        _state["prophet"] = prophet
        _state["xgboost"] = xgb
        _state["df"] = df
        logger.info(
            f"Models loaded: {len(prophet.trained_medicines)} medicines "
            f"| {len(df):,} historical records"
        )
    except Exception as exc:
        logger.warning(
            f"Could not load pre-trained models ({exc}). "
            "POST /train to train them."
        )
    yield
    logger.info("Shutting down …")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="PharmaSmart – Demand Forecasting API",
    description=(
        "Predicts future medicine demand using **Prophet** (time-series) "
        "and **XGBoost** (ML with feature engineering). "
        "Helps pharmacies optimise stock replenishment."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")


# ---------------------------------------------------------------------------
# Root redirect
# ---------------------------------------------------------------------------

@app.get("/", include_in_schema=False)
def root():
    return {
        "service": "PharmaSmart Demand Forecasting",
        "docs": "/docs",
        "health": "/api/v1/health",
    }
