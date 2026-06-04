"""
Data preprocessing and feature engineering.

Responsibilities:
  1. Validate and clean raw sales data.
  2. Build the Prophet-ready DataFrame (ds / y columns).
  3. Engineer time-series features for XGBoost:
       - calendar features (DOW, month, quarter, is_weekend, is_holiday)
       - lag features  (t-1, t-7, t-14, t-30)
       - rolling statistics (mean/std over 7-day and 30-day windows)
"""

from __future__ import annotations

import pandas as pd
import numpy as np

# Moroccan public holidays (month, day) – same set as in data_generator
HOLIDAYS_MOROCCO = {
    (1, 1), (1, 11), (5, 1), (7, 30), (8, 14),
    (8, 20), (8, 21), (11, 6), (11, 18),
}


# ---------------------------------------------------------------------------
# Cleaning
# ---------------------------------------------------------------------------

def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Validate and clean the raw sales DataFrame.

    Expected input columns: date, medicine, quantity_sold
    """
    required = {"date", "medicine", "quantity_sold"}
    missing = required - set(df.columns)
    if missing:
        raise ValueError(f"Missing columns: {missing}")

    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df["quantity_sold"] = pd.to_numeric(df["quantity_sold"], errors="coerce").fillna(0)
    df["quantity_sold"] = df["quantity_sold"].clip(lower=0)

    # Remove duplicates (keep last entry when same date+medicine)
    df = df.drop_duplicates(subset=["date", "medicine"], keep="last")
    df = df.sort_values(["medicine", "date"]).reset_index(drop=True)
    return df


# ---------------------------------------------------------------------------
# Prophet format
# ---------------------------------------------------------------------------

def to_prophet_df(df: pd.DataFrame, medicine: str) -> pd.DataFrame:
    """
    Filter for one medicine and return a Prophet-ready DataFrame.

    Prophet expects columns named 'ds' (datestamp) and 'y' (target value).
    """
    med_df = df[df["medicine"] == medicine].copy()
    prophet_df = med_df.rename(columns={"date": "ds", "quantity_sold": "y"})[["ds", "y"]]
    prophet_df = prophet_df.sort_values("ds").reset_index(drop=True)
    return prophet_df


# ---------------------------------------------------------------------------
# Feature engineering for XGBoost
# ---------------------------------------------------------------------------

def _is_holiday(date: pd.Timestamp) -> int:
    return int((date.month, date.day) in HOLIDAYS_MOROCCO)


def add_calendar_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add calendar-derived columns to a single-medicine time-indexed DataFrame."""
    df = df.copy()
    df["dayofweek"]  = df["date"].dt.dayofweek          # 0=Mon … 6=Sun
    df["dayofmonth"] = df["date"].dt.day
    df["month"]      = df["date"].dt.month
    df["quarter"]    = df["date"].dt.quarter
    df["year"]       = df["date"].dt.year
    df["weekofyear"] = df["date"].dt.isocalendar().week.astype(int)
    df["is_weekend"]  = (df["dayofweek"] >= 5).astype(int)
    df["is_month_start"] = df["date"].dt.is_month_start.astype(int)
    df["is_month_end"]   = df["date"].dt.is_month_end.astype(int)
    df["is_holiday"]     = df["date"].apply(_is_holiday)
    return df


def add_lag_features(
    df: pd.DataFrame,
    target_col: str = "quantity_sold",
    lags: list[int] | None = None,
) -> pd.DataFrame:
    """Add autoregressive lag features."""
    if lags is None:
        lags = [1, 7, 14, 30]
    df = df.copy()
    for lag in lags:
        df[f"lag_{lag}"] = df[target_col].shift(lag)
    return df


def add_rolling_features(
    df: pd.DataFrame,
    target_col: str = "quantity_sold",
    windows: list[int] | None = None,
) -> pd.DataFrame:
    """Add rolling mean and standard deviation features."""
    if windows is None:
        windows = [7, 30]
    df = df.copy()
    for w in windows:
        df[f"rolling_mean_{w}"] = df[target_col].shift(1).rolling(window=w).mean()
        df[f"rolling_std_{w}"]  = df[target_col].shift(1).rolling(window=w).std()
    return df


def build_xgboost_features(
    df: pd.DataFrame,
    medicine: str,
    target_col: str = "quantity_sold",
) -> pd.DataFrame:
    """
    Build the full feature matrix for one medicine.

    Pipeline:
      filter → calendar → lags → rolling → drop NaN rows
    """
    med_df = df[df["medicine"] == medicine].copy()
    med_df = med_df.sort_values("date").reset_index(drop=True)

    med_df = add_calendar_features(med_df)
    med_df = add_lag_features(med_df, target_col=target_col)
    med_df = add_rolling_features(med_df, target_col=target_col)

    # Drop rows that have NaN (created by lags / rolling at the start of the series)
    med_df = med_df.dropna().reset_index(drop=True)
    return med_df


FEATURE_COLS = [
    "dayofweek", "dayofmonth", "month", "quarter", "year", "weekofyear",
    "is_weekend", "is_month_start", "is_month_end", "is_holiday",
    "lag_1", "lag_7", "lag_14", "lag_30",
    "rolling_mean_7", "rolling_std_7", "rolling_mean_30", "rolling_std_30",
]
