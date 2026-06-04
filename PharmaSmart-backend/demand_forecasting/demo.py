"""
Quick demo: generate data, train models, print sample forecasts.

Run from the demand_forecasting/ directory:
    python demo.py
"""

from __future__ import annotations

from forecasting.pipeline import run_pipeline


def main():
    # Full pipeline (generate data → train → evaluate)
    result = run_pipeline(evaluate=True, test_days=30)

    df      = result["df"]
    prophet = result["prophet"]
    xgb     = result["xgboost"]

    print("\n" + "=" * 60)
    print("Sample 7-day forecast — Paracetamol")
    print("=" * 60)

    p_fc = prophet.predict("Paracetamol", horizon=7)
    print("\nProphet:")
    print(p_fc[["ds", "yhat", "yhat_lower", "yhat_upper"]].to_string(index=False))

    x_fc = xgb.predict(df, "Paracetamol", horizon=7)
    print("\nXGBoost:")
    print(x_fc[["ds", "yhat"]].to_string(index=False))

    print("\n" + "=" * 60)
    print("XGBoost Feature Importances — Paracetamol")
    print("=" * 60)
    imp = xgb.feature_importance("Paracetamol").head(10)
    print(imp.to_string(index=False))


if __name__ == "__main__":
    main()
