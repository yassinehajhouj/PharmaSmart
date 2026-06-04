"""
Synthetic pharmacy sales data generator.

Produces two years of realistic daily consumption records per medicine,
encoding weekly cycles, annual seasonality, per-medicine trends, and noise.
The output is a tidy DataFrame and an optional CSV export.
"""

from __future__ import annotations

import os
from pathlib import Path

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# Medicine catalogue with realistic seasonal / demand profiles
# ---------------------------------------------------------------------------
MEDICINES: dict[str, dict] = {
    "Paracetamol": {
        "base_demand": 45,
        "trend": 0.005,           # slight upward trend per day
        "winter_boost": 1.4,      # multiplier Nov–Feb (fever/flu season)
        "spring_boost": 1.1,
        "summer_boost": 0.9,
        "noise_std": 6,
    },
    "Amoxicilline": {
        "base_demand": 30,
        "trend": 0.003,
        "winter_boost": 1.5,
        "spring_boost": 1.1,
        "summer_boost": 0.8,
        "noise_std": 5,
    },
    "Ibuprofene": {
        "base_demand": 35,
        "trend": 0.004,
        "winter_boost": 1.2,
        "spring_boost": 1.3,      # allergy/pain season
        "summer_boost": 1.0,
        "noise_std": 5,
    },
    "Omeprazole": {
        "base_demand": 25,
        "trend": 0.006,
        "winter_boost": 1.0,
        "spring_boost": 1.0,
        "summer_boost": 1.1,      # dietary changes in summer
        "noise_std": 4,
    },
    "Metformine": {
        "base_demand": 40,
        "trend": 0.008,           # rising chronic disease prevalence
        "winter_boost": 1.0,
        "spring_boost": 1.0,
        "summer_boost": 1.0,
        "noise_std": 3,
    },
    "Vitamine_D": {
        "base_demand": 20,
        "trend": 0.010,
        "winter_boost": 1.8,      # vitamin D supplement peak in winter
        "spring_boost": 1.2,
        "summer_boost": 0.7,
        "noise_std": 4,
    },
    "Doliprane_Sirop": {       # paediatric formulation – weekend dip
        "base_demand": 18,
        "trend": 0.002,
        "winter_boost": 1.6,
        "spring_boost": 1.1,
        "summer_boost": 0.9,
        "noise_std": 3,
    },
    "Loratadine": {            # antihistamine – spring allergy peak
        "base_demand": 15,
        "trend": 0.003,
        "winter_boost": 0.7,
        "spring_boost": 2.0,
        "summer_boost": 1.2,
        "noise_std": 4,
    },
}

# Day-of-week multipliers (Monday=0 … Sunday=6)
# Pharmacies are busier Mon–Fri; quieter on Sunday
DOW_FACTORS = [1.05, 1.10, 1.10, 1.05, 1.15, 0.90, 0.65]

# Public holidays – Moroccan calendar (fixed-date subset)
HOLIDAYS_MOROCCO = {
    (1, 1):   "Nouvel An",
    (1, 11):  "Manifeste de l'Indépendance",
    (5, 1):   "Fête du Travail",
    (7, 30):  "Fête du Trône",
    (8, 14):  "Allégeance Oued Eddahab",
    (8, 20):  "Révolution du Roi et du Peuple",
    (8, 21):  "Fête de la Jeunesse",
    (11, 6):  "Marche Verte",
    (11, 18): "Fête de l'Indépendance",
}


def _seasonal_multiplier(month: int, profile: dict) -> float:
    """Return seasonal demand multiplier for the given month and medicine profile."""
    if month in (12, 1, 2):
        return profile["winter_boost"]
    if month in (3, 4, 5):
        return profile["spring_boost"]
    if month in (6, 7, 8):
        return profile["summer_boost"]
    return 1.0   # autumn


def _is_holiday(date: pd.Timestamp) -> bool:
    return (date.month, date.day) in HOLIDAYS_MOROCCO


def generate_sales_data(
    start_date: str = "2023-01-01",
    end_date: str = "2024-12-31",
    medicines: dict[str, dict] | None = None,
    random_seed: int = 42,
) -> pd.DataFrame:
    """
    Generate synthetic daily pharmacy sales for each medicine.

    Returns a tidy DataFrame with columns:
        date, medicine, quantity_sold
    """
    rng = np.random.default_rng(random_seed)
    if medicines is None:
        medicines = MEDICINES

    date_range = pd.date_range(start=start_date, end=end_date, freq="D")
    records: list[dict] = []

    for med_name, profile in medicines.items():
        base = profile["base_demand"]
        trend_rate = profile["trend"]
        noise_std = profile["noise_std"]

        for day_idx, date in enumerate(date_range):
            # 1. Long-term linear trend
            trend_component = base + trend_rate * day_idx

            # 2. Annual seasonality
            seasonal = _seasonal_multiplier(date.month, profile)

            # 3. Weekly cycle
            dow_factor = DOW_FACTORS[date.dayofweek]

            # 4. Public holiday penalty (−30 %)
            holiday_factor = 0.70 if _is_holiday(date) else 1.0

            # 5. Gaussian noise (multiplicative)
            noise = rng.normal(loc=1.0, scale=noise_std / base)

            quantity = (
                trend_component * seasonal * dow_factor * holiday_factor * max(noise, 0.1)
            )
            records.append(
                {
                    "date": date,
                    "medicine": med_name,
                    "quantity_sold": max(0, round(quantity)),
                }
            )

    df = pd.DataFrame(records)
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["medicine", "date"]).reset_index(drop=True)
    return df


def save_dataset(df: pd.DataFrame, path: str | Path) -> None:
    """Persist the dataset as CSV."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
    print(f"[DataGenerator] Dataset saved → {path}  ({len(df):,} rows)")


def load_or_generate(csv_path: str | Path, **kwargs) -> pd.DataFrame:
    """Load existing CSV or generate + save a fresh one."""
    csv_path = Path(csv_path)
    if csv_path.exists():
        df = pd.read_csv(csv_path, parse_dates=["date"])
        print(f"[DataGenerator] Loaded existing dataset: {csv_path}  ({len(df):,} rows)")
        return df

    df = generate_sales_data(**kwargs)
    save_dataset(df, csv_path)
    return df
