"""
Low-selling medicine detection, overall stats, and seasonal intelligence.
"""
from __future__ import annotations

import logging
from datetime import date

import pandas as pd
from django.utils import timezone

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Seasonal knowledge base (Moroccan pharmacy context)
# ---------------------------------------------------------------------------

_SEASON_MAP = {
    # month → (season_name, emoji, high_demand_keywords, low_demand_keywords, tip)
    12: ('Hiver',     '❄️',  ['grippe', 'rhume', 'toux', 'vitamine', 'antibiotique', 'fièvre', 'antitussif', 'paracétamol', 'ibuprofène'],
                             ['allergie', 'antihistaminique', 'solaire'],
                             'Forte demande attendue pour les antigrippaux, vitamines C et antibiotiques.'),
     1: ('Hiver',     '❄️',  ['grippe', 'rhume', 'toux', 'vitamine', 'antibiotique', 'fièvre', 'antitussif', 'paracétamol'],
                             ['allergie', 'antihistaminique'],
                             'Pic hivernal — stockez les antigrippaux et anti-douleurs.'),
     2: ('Hiver',     '❄️',  ['grippe', 'rhume', 'vitamine', 'antibiotique', 'paracétamol'],
                             ['allergie', 'solaire'],
                             'Fin d\'hiver : prévoyez la transition vers les antiallergiques.'),
     3: ('Printemps', '🌸', ['allergie', 'antihistaminique', 'rhume des foins', 'décongestionnant', 'vitamine', 'anti-inflammatoire'],
                             ['grippe', 'antitussif'],
                             'Saison des allergies — antihistaminiques et décongestionnants en hausse.'),
     4: ('Printemps', '🌸', ['allergie', 'antihistaminique', 'rhume des foins', 'décongestionnant', 'anti-inflammatoire'],
                             ['grippe', 'vitamine c'],
                             'Pic printanier — anticipez la demande en antiallergiques.'),
     5: ('Printemps', '🌸', ['allergie', 'antihistaminique', 'anti-inflammatoire', 'analgésique'],
                             ['grippe', 'antitussif'],
                             'Allergies printanières encore actives — bonne période pour les analgésiques.'),
     6: ('Été',       '☀️', ['diarrhée', 'déshydratation', 'solaire', 'anti-inflammatoire', 'smecta', 'sérum', 'stomac'],
                             ['grippe', 'vitamine', 'antibiotique rhinite'],
                             'Été : hausse des troubles digestifs et de la protection solaire.'),
     7: ('Été',       '☀️', ['diarrhée', 'déshydratation', 'solaire', 'stomac', 'sérum', 'anti-inflammatoire'],
                             ['grippe', 'antitussif'],
                             'Pic estival — troubles GI et coups de soleil fréquents.'),
     8: ('Été',       '☀️', ['diarrhée', 'déshydratation', 'stomac', 'anti-inflammatoire', 'solaire'],
                             ['grippe', 'rhume'],
                             'Forte chaleur — prévenez les ruptures de smecta et sérum oral.'),
     9: ('Automne',   '🍂', ['vitamine', 'immunité', 'grippe', 'antibiotique', 'analgésique'],
                             ['allergie', 'antihistaminique', 'solaire'],
                             'Rentrée : vitamines et boosters immunitaires très demandés.'),
    10: ('Automne',   '🍂', ['vitamine', 'grippe', 'antibiotique', 'rhume', 'immunité'],
                             ['allergie', 'solaire'],
                             'Début de la saison grippale — constituez vos stocks antiviraux.'),
    11: ('Automne',   '🍂', ['grippe', 'rhume', 'vitamine', 'antibiotique', 'fièvre', 'paracétamol'],
                             ['allergie', 'solaire', 'antihistaminique'],
                             'Pré-hiver : anticipez la hausse des antigrippaux et paracétamol.'),
}


def get_seasonal_context() -> dict:
    """Return current season info and pharmaceutical demand insights."""
    month = date.today().month
    name, emoji, high_kw, low_kw, tip = _SEASON_MAP.get(month, _SEASON_MAP[3])
    return {
        'saison':       name,
        'emoji':        emoji,
        'mois':         month,
        'high_demand':  high_kw,
        'low_demand':   low_kw,
        'conseil':      tip,
    }


# ---------------------------------------------------------------------------
# Low-seller detection
# ---------------------------------------------------------------------------

def detect_low_sellers(
    df: pd.DataFrame,
    pharmacie_id: int,
    period_days: int = 90,
    top_n: int = 20,
) -> list[dict]:
    """
    Identify medicines with low or declining historical sales.

    Returns list sorted by risk score (highest risk first).
    """
    if df.empty:
        return []

    today      = pd.Timestamp(timezone.now().date())
    cutoff     = today - pd.Timedelta(days=period_days)
    half_point = today - pd.Timedelta(days=period_days // 2)

    ph_df = df[df['pharmacie_id'] == pharmacie_id].copy()
    ph_df['date'] = pd.to_datetime(ph_df['date'])
    # Ensure tz-naive for consistent comparisons (dates come from the preprocessor as tz-naive)
    if ph_df['date'].dt.tz is not None:
        ph_df['date'] = ph_df['date'].dt.tz_convert(None)
    recent = ph_df[ph_df['date'] >= cutoff]

    if recent.empty:
        return []

    agg = recent.groupby(['medicament_id', 'medicament_nom']).agg(
        quantite_totale=('quantite', 'sum'),
        nb_jours_vente=('date', 'nunique'),
        derniere_vente=('date', 'max'),
    ).reset_index()

    agg['quantite_moy_jour']           = agg['quantite_totale'] / period_days
    agg['jours_depuis_derniere_vente'] = (today - agg['derniere_vente']).dt.days

    first_half  = ph_df[(ph_df['date'] >= cutoff) & (ph_df['date'] < half_point)]
    second_half = ph_df[ph_df['date'] >= half_point]
    first_sums  = first_half.groupby('medicament_id')['quantite'].sum()
    second_sums = second_half.groupby('medicament_id')['quantite'].sum()

    def _trend(mid: int) -> str:
        f, s = first_sums.get(mid, 0), second_sums.get(mid, 0)
        if f == 0 and s == 0:
            return 'STABLE'
        return 'BAISSE' if s < f * 0.8 else ('HAUSSE' if s > f * 1.2 else 'STABLE')

    agg['tendance'] = agg['medicament_id'].apply(_trend)

    max_qty     = agg['quantite_totale'].max() or 1
    max_no_sale = agg['jours_depuis_derniere_vente'].max() or 1

    def _risk(row) -> float:
        qty_score   = (1 - row['quantite_totale'] / max_qty) * 50
        nosale_score = min(row['jours_depuis_derniere_vente'] / max_no_sale * 30, 30)
        trend_score = 20 if row['tendance'] == 'BAISSE' else (0 if row['tendance'] == 'HAUSSE' else 10)
        return round(qty_score + nosale_score + trend_score, 1)

    agg['score_risque'] = agg.apply(_risk, axis=1)
    agg = agg.sort_values('score_risque', ascending=False).head(top_n)

    records = []
    for row in agg.to_dict('records'):
        records.append({
            'medicament_id':               int(row['medicament_id']),
            'medicament_nom':              str(row['medicament_nom']),
            'quantite_totale':             int(row['quantite_totale']),
            'quantite_moy_jour':           round(float(row['quantite_moy_jour']), 2),
            'nb_jours_vente':              int(row['nb_jours_vente']),
            'jours_depuis_derniere_vente': int(row['jours_depuis_derniere_vente']),
            'tendance':                    row['tendance'],
            'score_risque':                float(row['score_risque']),
        })
    return records


# ---------------------------------------------------------------------------
# Overall stats
# ---------------------------------------------------------------------------

def compute_overall_stats(df: pd.DataFrame, pharmacie_id: int, period_days: int = 90) -> dict:
    """High-level sales statistics for the ML dashboard."""
    empty = {'total_ventes': 0, 'medicaments_actifs': 0, 'pic_journalier': 0, 'periode_jours': period_days}
    if df.empty:
        return empty

    today  = pd.Timestamp(timezone.now().date())
    cutoff = today - pd.Timedelta(days=period_days)

    ph_df = df[df['pharmacie_id'] == pharmacie_id].copy()
    if ph_df.empty:
        return empty

    # Normalise dates to tz-naive so comparisons work regardless of DB timezone setting
    dates = pd.to_datetime(ph_df['date'])
    if dates.dt.tz is not None:
        dates = dates.dt.tz_convert(None)
    ph_df['date'] = dates

    ph_df = ph_df[ph_df['date'] >= cutoff]
    if ph_df.empty:
        return empty

    daily_totals = ph_df.groupby('date')['quantite'].sum()
    return {
        'total_ventes':       int(ph_df['quantite'].sum()),
        'medicaments_actifs': int(ph_df['medicament_id'].nunique()),
        'pic_journalier':     int(daily_totals.max()),
        'periode_jours':      period_days,
    }
