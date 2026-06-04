"""
End-to-end training pipeline.

Orchestrates:
  1. Data generation / loading
  2. Cleaning
  3. Training Prophet + XGBoost for all medicines
  4. Model evaluation and comparison
  5. Saving trained models to disk
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from .data_generator import load_or_generate
from .preprocessor import clean_data
from .prophet_model import ProphetForecaster
from .xgboost_model import XGBoostForecaster
from .evaluator import compare_models, best_model_per_medicine

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_PATH    = BASE_DIR / "data" / "pharmacy_sales.csv"
MODEL_DIR    = BASE_DIR / "saved_models"


def run_pipeline(
    data_path: Path = DATA_PATH,
    model_dir: Path = MODEL_DIR,
    evaluate: bool = True,
    test_days: int = 30,
) -> dict:
    """
    Full training pipeline.  Returns a summary dict with:
        - df               : cleaned DataFrame
        - prophet          : fitted ProphetForecaster
        - xgboost          : fitted XGBoostForecaster
        - comparison       : metric table (if evaluate=True)
        - best_models      : best model per medicine (if evaluate=True)
    """
    print("=" * 60)
    print("PharmaSmart – Demand Forecasting Pipeline")
    print("=" * 60)

    # ------------------------------------------------------------------
    # Step 1 – Data
    # ------------------------------------------------------------------
    print("\n[1/4] Loading / generating dataset …")
    raw_df = load_or_generate(data_path)
    df = clean_data(raw_df)
    print(
        f"      {len(df):,} records | "
        f"{df['medicine'].nunique()} medicines | "
        f"{df['date'].min().date()} → {df['date'].max().date()}"
    )

    # ------------------------------------------------------------------
    # Step 2 – Train Prophet
    # ------------------------------------------------------------------
    print("\n[2/4] Training Prophet models …")
    prophet = ProphetForecaster(model_dir=model_dir / "prophet")
    prophet.fit_all(df)
    prophet.save_all()

    # ------------------------------------------------------------------
    # Step 3 – Train XGBoost
    # ------------------------------------------------------------------
    print("\n[3/4] Training XGBoost models …")
    xgb = XGBoostForecaster(model_dir=model_dir / "xgboost")
    xgb.fit_all(df)
    xgb.save_all()

    result: dict = {"df": df, "prophet": prophet, "xgboost": xgb}

    # ------------------------------------------------------------------
    # Step 4 – Evaluate
    # ------------------------------------------------------------------
    if evaluate:
        print(f"\n[4/4] Evaluating models on last {test_days}-day hold-out …")
        comparison = compare_models(df, prophet, xgb, test_days=test_days)
        best = best_model_per_medicine(comparison)

        print("\n--- Model Comparison (RMSE) ---")
        pivot = comparison.pivot(index="medicine", columns="model", values="RMSE")
        print(pivot.to_string())

        print("\n--- Best Model Per Medicine ---")
        print(best[["medicine", "model", "MAE", "RMSE", "MAPE"]].to_string(index=False))

        result["comparison"] = comparison
        result["best_models"] = best
    else:
        print("\n[4/4] Evaluation skipped.")

    print("\n Pipeline complete.")
    return result


def load_trained_models(
    model_dir: Path = MODEL_DIR,
    medicines: list[str] | None = None,
    data_path: Path = DATA_PATH,
) -> tuple[ProphetForecaster, XGBoostForecaster, pd.DataFrame]:
    """
    Load previously trained models from disk.
    Also returns the cleaned DataFrame (needed by XGBoost recursive predictor).
    """
    raw_df = load_or_generate(data_path)
    df = clean_data(raw_df)

    if medicines is None:
        medicines = df["medicine"].unique().tolist()

    prophet = ProphetForecaster(model_dir=model_dir / "prophet")
    xgb     = XGBoostForecaster(model_dir=model_dir / "xgboost")

    for med in medicines:
        try:
            prophet.load(med)
        except FileNotFoundError:
            pass
        try:
            xgb.load(med)
        except FileNotFoundError:
            pass

    return prophet, xgb, df
