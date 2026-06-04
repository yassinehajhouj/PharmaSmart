"""
Data loading and feature engineering for the ML module.
Reads directly from Django ORM – no external API needed.
"""
from __future__ import annotations

import logging
from datetime import date, timedelta

import numpy as np
import pandas as pd
from django.utils import timezone

logger = logging.getLogger(__name__)

# Moroccan public holidays (month, day)
MOROCCAN_HOLIDAYS: set[tuple[int, int]] = {
    (1, 1), (1, 11), (5, 1), (7, 30),
    (8, 14), (8, 20), (8, 21), (11, 6), (11, 18),
}

FEATURE_COLS = [
    'day_of_week', 'month', 'quarter', 'day_of_year', 'week_of_year',
    'is_weekend', 'is_holiday', 'trend',
    'lag_1', 'lag_7', 'lag_14', 'lag_21', 'lag_30',
    'rolling_mean_7', 'rolling_mean_14', 'rolling_mean_30',
    'rolling_std_7', 'rolling_std_30',
]


def is_holiday(d: date) -> bool:
    return (d.month, d.day) in MOROCCAN_HOLIDAYS


def load_sales_dataframe(pharmacie_id: int | None = None, days_back: int = 365) -> pd.DataFrame:
    """
    Load historical sales from the orders DB tables into a tidy DataFrame.

    Returned columns:
        date (datetime64), pharmacie_id (int), medicament_id (int),
        medicament_nom (str), quantite (int)
    """
    from orders.models import LigneCommande

    cutoff = timezone.now() - timedelta(days=days_back)
    VALID_STATUTS = ['CONFIRMEE', 'EN_PREPARATION', 'PRETE', 'EN_LIVRAISON', 'LIVREE']

    qs = LigneCommande.objects.select_related('commande', 'medicament').filter(
        commande__created_at__gte=cutoff,
        commande__statut__in=VALID_STATUTS,
    )
    if pharmacie_id is not None:
        qs = qs.filter(commande__pharmacie_id=pharmacie_id)

    records = list(qs.values(
        'commande__created_at',
        'commande__pharmacie_id',
        'medicament_id',
        'medicament__nom',
        'quantite',
    ))

    empty = pd.DataFrame(columns=['date', 'pharmacie_id', 'medicament_id', 'medicament_nom', 'quantite'])
    if not records:
        return empty

    df = pd.DataFrame(records)
    df.rename(columns={
        'commande__created_at': 'created_at',
        'commande__pharmacie_id': 'pharmacie_id',
        'medicament__nom': 'medicament_nom',
    }, inplace=True)

    _raw = pd.to_datetime(df['created_at'])
    # Strip timezone so all date comparisons stay tz-naive (Django stores UTC).
    if _raw.dt.tz is not None:
        _raw = _raw.dt.tz_convert(None)
    df['date'] = _raw.dt.normalize()
    df = (
        df.groupby(['date', 'pharmacie_id', 'medicament_id', 'medicament_nom'], as_index=False)
        ['quantite'].sum()
    )
    df.sort_values('date', inplace=True)
    df.reset_index(drop=True, inplace=True)
    logger.info(f"Loaded {len(df)} daily sales rows from DB.")
    return df


def build_time_series(df: pd.DataFrame, pharmacie_id: int, medicament_id: int) -> pd.DataFrame:
    """
    Extract and fill-forward a complete daily time series for one
    (pharmacy, medicine) pair.

    Returns DataFrame with columns: date (datetime64), quantite (float).
    Returns empty DataFrame if no data found.
    """
    sub = df[
        (df['pharmacie_id'] == pharmacie_id) &
        (df['medicament_id'] == medicament_id)
    ].copy()

    if sub.empty:
        return pd.DataFrame()

    sub = sub.set_index('date')['quantite']
    full_range = pd.date_range(sub.index.min(), sub.index.max(), freq='D')
    reindexed  = sub.reindex(full_range, fill_value=0)
    # Build the DataFrame explicitly to avoid the pandas ≥2.0 FutureWarning
    # that triggers when reset_index() infers dtypes from a DatetimeIndex.
    return pd.DataFrame({'date': reindexed.index, 'quantite': reindexed.values})


def add_features(ts: pd.DataFrame) -> pd.DataFrame:
    """
    Add calendar, lag, and rolling features to a daily time series DataFrame.
    Drops rows that cannot be fully populated (head rows missing lags).

    Input:  DataFrame with columns [date, quantite]
    Output: DataFrame with all FEATURE_COLS + quantite (target)
    """
    df = ts.copy().sort_values('date').reset_index(drop=True)

    # --- Calendar ---
    df['day_of_week']  = df['date'].dt.dayofweek
    df['month']        = df['date'].dt.month
    df['quarter']      = df['date'].dt.quarter
    df['day_of_year']  = df['date'].dt.dayofyear
    df['week_of_year'] = df['date'].dt.isocalendar().week.astype(int)
    df['is_weekend']   = df['day_of_week'].isin([5, 6]).astype(int)
    df['is_holiday']   = df['date'].apply(lambda d: int(is_holiday(d.date())))

    # --- Lag features (shift avoids leakage) ---
    for lag in [1, 7, 14, 21, 30]:
        df[f'lag_{lag}'] = df['quantite'].shift(lag)

    # --- Rolling statistics (shift 1 to avoid leakage) ---
    shifted = df['quantite'].shift(1)
    df['rolling_mean_7']  = shifted.rolling(7,  min_periods=1).mean()
    df['rolling_mean_14'] = shifted.rolling(14, min_periods=1).mean()
    df['rolling_mean_30'] = shifted.rolling(30, min_periods=1).mean()
    df['rolling_std_7']   = shifted.rolling(7,  min_periods=1).std().fillna(0)
    df['rolling_std_30']  = shifted.rolling(30, min_periods=1).std().fillna(0)

    # --- Global trend ---
    df['trend'] = np.arange(len(df))

    df.dropna(subset=FEATURE_COLS, inplace=True)
    return df
