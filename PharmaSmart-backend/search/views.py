import math
from datetime import date

from django.db.models import Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status

from inventory.models import Stock


# ── Search scoring weights (must sum to 1.0) ─────────────────────────────────

W_DISTANCE   = 0.50
W_QUANTITY   = 0.30
W_EXPIRATION = 0.20

MAX_DISTANCE_KM = 50.0


# ── Haversine distance ────────────────────────────────────────────────────────

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Great-circle distance in kilometres between two WGS-84 coordinates."""
    R = 6_371.0
    φ1, λ1, φ2, λ2 = map(math.radians, (lat1, lon1, lat2, lon2))
    dφ, dλ = φ2 - φ1, λ2 - λ1
    a = math.sin(dφ / 2) ** 2 + math.cos(φ1) * math.cos(φ2) * math.sin(dλ / 2) ** 2
    return R * 2 * math.asin(math.sqrt(a))


# ── Per-pharmacy scoring ──────────────────────────────────────────────────────

def score_stock(stock, lat_client, lon_client):
    """
    Returns (score, distance_km) for one Stock row.
    score ∈ [0, 1] — higher is better.
    """
    ph = stock.pharmacie

    if lat_client is not None and ph.latitude and ph.longitude:
        dist_km    = haversine_km(lat_client, lon_client,
                                  float(ph.latitude), float(ph.longitude))
        dist_score = max(0.0, 1.0 - dist_km / MAX_DISTANCE_KM)
    else:
        dist_km    = None
        dist_score = 0.5

    qty_score = min(stock.quantite / 100.0, 1.0)

    if stock.date_expiration:
        days_left = (stock.date_expiration - date.today()).days
        exp_score = max(min(days_left / 365.0, 1.0), 0.0)
    else:
        exp_score = 0.8

    total = W_DISTANCE * dist_score + W_QUANTITY * qty_score + W_EXPIRATION * exp_score
    return round(total, 4), (round(dist_km, 2) if dist_km is not None else None)


# ── View ──────────────────────────────────────────────────────────────────────

class MedicamentSearchView(APIView):
    """
    GET /api/search/?q=doliprane[&lat=33.5&lng=-7.6]

    Stock-based query: one result per (medication, pharmacy) pair.
    Price from Stock.prix_vente; falls back to Medicament.prix only when unset.
    Missing pharmacy GPS → distance_km=null, result still included.
    """
    permission_classes = [permissions.AllowAny]

    def _parse_location(self, request):
        raw_lat = request.query_params.get('lat')
        raw_lon = request.query_params.get('lng')
        if raw_lat is None or raw_lon is None:
            return None, None
        try:
            return float(raw_lat), float(raw_lon)
        except ValueError:
            return None, None

    def _build_result_entry(self, stock, lat, lon):
        sc, dist = score_stock(stock, lat, lon)
        ph = stock.pharmacie
        med = stock.medicament
        return {
            'stock_id':         stock.id,
            'medicament_id':    med.id,
            'medicament_nom':   med.nom,
            'categorie':        med.categorie.nom,
            'principe_actif':   med.principe_actif,
            'dosage':           med.dosage,
            'forme':            med.forme,
            'ordonnance_requise': med.ordonnance_requise,
            'image':            (self.request.build_absolute_uri(med.image.url)
                                 if med.image else None),
            'pharmacie_id':     ph.id,
            'nom_pharmacie':    ph.nom_pharmacie,
            'ville':            ph.ville,
            'telephone':        ph.telephone,
            'quantite':         stock.quantite,
            'prix':             str(stock.prix_vente if stock.prix_vente is not None else med.prix),
            'date_expiration':  (stock.date_expiration.isoformat()
                                 if stock.date_expiration else None),
            'distance_km':      dist,
            'score':            sc,
        }

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if not q:
            return Response(
                {'detail': "Le paramètre 'q' est requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        lat, lon = self._parse_location(request)

        stocks = (
            Stock.objects
            .filter(
                Q(medicament__nom__icontains=q) | Q(medicament__principe_actif__icontains=q),
                quantite__gt=0,
                medicament__is_active=True,
                pharmacie__is_active=True,
                pharmacie__approval_status='APPROVED',
            )
            .select_related('pharmacie', 'medicament__categorie')
            .order_by('medicament__nom')
        )

        results = [self._build_result_entry(s, lat, lon) for s in stocks]
        results.sort(key=lambda p: p['score'], reverse=True)
        return Response(results)


# ── Recommendation weights (must sum to 1.0) ──────────────────────────────────

W_REC_DISTANCE   = 0.40
W_REC_QUANTITY   = 0.30
W_REC_PRICE      = 0.20
W_REC_EXPIRATION = 0.10


# ── Min-max normalisation helpers ─────────────────────────────────────────────

def _minmax_range(values):
    """Return (min, max) for the non-None entries; falls back to (0, 1)."""
    valid = [v for v in values if v is not None]
    if not valid:
        return 0.0, 1.0
    return min(valid), max(valid)


def _norm_asc(value, mn, mx):
    """Higher value → score closer to 1 (quantity, days-left)."""
    if value is None:
        return 0.5
    return 1.0 if mx == mn else (value - mn) / (mx - mn)


def _norm_desc(value, mn, mx):
    """Lower value → score closer to 1 (distance, price)."""
    if value is None:
        return 0.5
    return 1.0 if mx == mn else 1.0 - (value - mn) / (mx - mn)


# ── View ──────────────────────────────────────────────────────────────────────

class BestPharmacyView(APIView):
    """
    GET /api/search/recommend/?q=<name>[&lat=<lat>&lng=<lon>]

    For a given medication name, returns all pharmacies that have it in stock
    (quantite > 0), ranked by a weighted score:

        score = 0.4×distance + 0.3×quantity + 0.2×price + 0.1×expiration

    All four sub-scores are min-max normalised across the result set.
    Price is always taken from Stock.prix_vente; falls back to Medicament.prix
    only when prix_vente was never set for that stock.
    The top-ranked pharmacy receives "is_best_choice": true.
    """
    permission_classes = [permissions.AllowAny]

    def _parse_location(self, request):
        raw_lat = request.query_params.get('lat')
        raw_lon = request.query_params.get('lng')
        if raw_lat is None or raw_lon is None:
            return None, None
        try:
            return float(raw_lat), float(raw_lon)
        except ValueError:
            return None, None

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        if not q:
            return Response(
                {'detail': "Le paramètre 'q' est requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        lat, lon = self._parse_location(request)

        stocks = list(
            Stock.objects
            .filter(
                Q(medicament__nom__icontains=q) | Q(medicament__principe_actif__icontains=q),
                quantite__gt=0,
                medicament__is_active=True,
                pharmacie__is_active=True,
                pharmacie__approval_status='APPROVED',
            )
            .select_related('pharmacie', 'medicament')
        )

        if not stocks:
            return Response(
                {'detail': "Ce médicament n'est disponible dans aucune pharmacie."},
                status=status.HTTP_404_NOT_FOUND,
            )

        med_nom = stocks[0].medicament.nom
        today = date.today()

        raw = []
        for s in stocks:
            ph = s.pharmacie
            dist_km = (
                haversine_km(lat, lon, float(ph.latitude), float(ph.longitude))
                if (lat is not None and ph.latitude and ph.longitude)
                else None
            )
            price = float(s.prix_vente) if s.prix_vente is not None else float(s.medicament.prix)
            days_left = (s.date_expiration - today).days if s.date_expiration else None
            raw.append({
                'stock':     s,
                'dist_km':   dist_km,
                'price':     price,
                'qty':       s.quantite,
                'days_left': days_left,
            })

        dist_mn,  dist_mx  = _minmax_range([r['dist_km']   for r in raw])
        price_mn, price_mx = _minmax_range([r['price']     for r in raw])
        qty_mn,   qty_mx   = _minmax_range([r['qty']       for r in raw])
        exp_mn,   exp_mx   = _minmax_range([r['days_left'] for r in raw])

        results = []
        for r in raw:
            score = (
                W_REC_DISTANCE   * _norm_desc(r['dist_km'],   dist_mn,  dist_mx)  +
                W_REC_QUANTITY   * _norm_asc( r['qty'],        qty_mn,   qty_mx)   +
                W_REC_PRICE      * _norm_desc(r['price'],      price_mn, price_mx) +
                W_REC_EXPIRATION * _norm_asc( r['days_left'],  exp_mn,   exp_mx)
            )
            s, ph = r['stock'], r['stock'].pharmacie
            results.append({
                '_score':          score,
                'stock_id':        s.id,
                'medicament_id':   s.medicament_id,
                'medicament_nom':  s.medicament.nom,
                'pharmacie_id':    ph.id,
                'pharmacie':       ph.nom_pharmacie,
                'ville':           ph.ville,
                'distance':        round(r['dist_km'], 2) if r['dist_km'] is not None else None,
                'prix':            r['price'],
                'quantite':        r['qty'],
                'image':           (request.build_absolute_uri(s.medicament.image.url)
                                    if s.medicament.image else None),
                'date_expiration': s.date_expiration.isoformat() if s.date_expiration else None,
                'score':           round(score, 4),
                'is_best_choice':  False,
            })

        results.sort(key=lambda x: x['_score'], reverse=True)
        results[0]['is_best_choice'] = True

        for r in results:
            del r['_score']

        return Response({'medicament': med_nom, 'results': results})
