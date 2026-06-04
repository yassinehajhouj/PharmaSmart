from math import radians, cos, sin, asin, sqrt
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import defaultdict

import requests as http_requests

from django.db.models import Q
from rest_framework import viewsets, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Categorie, Medicament
from .serializers import CategorieSerializer, MedicamentSerializer, MedicamentListSerializer
from inventory.models import Stock


def _haversine(lat1, lon1, lat2, lon2):
    R = 6371
    lat1, lon1, lat2, lon2 = map(radians, [float(lat1), float(lon1), float(lat2), float(lon2)])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return R * 2 * asin(sqrt(a))


def _get_osrm_duration(lat1, lon1, lat2, lon2):
    try:
        url = (
            f"http://router.project-osrm.org/route/v1/driving/"
            f"{lon2},{lat2};{lon1},{lat1}?overview=false"
        )
        r = http_requests.get(url, timeout=3)
        data = r.json()
        if data.get('code') == 'Ok':
            return round(data['routes'][0]['duration'] / 60, 1)
    except Exception:
        pass
    return None


class CategorieViewSet(viewsets.ModelViewSet):
    queryset = Categorie.objects.filter(is_active=True)
    serializer_class = CategorieSerializer
    permission_classes = [permissions.AllowAny]


class MedicamentViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['nom', 'description', 'principe_actif', 'dosage']
    ordering_fields = ['nom', 'prix']
    ordering = ['nom']

    def get_serializer_class(self):
        if self.action == 'list':
            return MedicamentListSerializer
        return MedicamentSerializer

    def _pharmacist_pharmacy(self):
        user = self.request.user
        if not user.is_authenticated:
            return None
        if hasattr(user, 'pharmacy_profile'):
            return user.pharmacy_profile
        if hasattr(user, 'personnel_profile'):
            return user.personnel_profile.pharmacie
        return None

    def get_queryset(self):
        base = Medicament.objects.filter(is_active=True)
        pharmacie = self._pharmacist_pharmacy()
        if pharmacie:
            return base.filter(
                Q(pharmacie__isnull=True) | Q(pharmacie=pharmacie)
            )
        return base.filter(
            stocks__quantite__gt=0,
            stocks__pharmacie__approval_status='APPROVED',
            stocks__pharmacie__is_active=True,
        ).distinct()

    def _client_stocks_qs(self):
        return (
            Stock.objects
            .filter(
                quantite__gt=0,
                pharmacie__approval_status='APPROVED',
                pharmacie__is_active=True,
                medicament__is_active=True,
            )
            .select_related('medicament__categorie', 'pharmacie')
            .order_by('medicament__nom')
        )

    def _stocks_to_grouped(self, stocks):
        groups = defaultdict(list)
        for s in stocks:
            groups[s.medicament_id].append(s)

        result = []
        for _med_id, med_stocks in groups.items():
            med = med_stocks[0].medicament
            pharmacies_disponibles = [
                {
                    'id': s.pharmacie_id,
                    'nom_pharmacie': s.pharmacie.nom_pharmacie,
                    'ville': s.pharmacie.ville,
                    'stock': s.quantite,
                    'prix': str(s.prix_vente if s.prix_vente is not None else med.prix),
                }
                for s in med_stocks
            ]
            prix_min = min(float(p['prix']) for p in pharmacies_disponibles)
            result.append({
                'id': med.id,
                'nom': med.nom,
                'description': med.description or '',
                'categorie_nom': med.categorie.nom,
                'dosage': med.dosage or '',
                'forme': med.forme or '',
                'prix': str(prix_min),
                'image': self.request.build_absolute_uri(med.image.url) if med.image else None,
                'ordonnance_requise': med.ordonnance_requise,
                'is_active': med.is_active,
                'pharmacies_disponibles': pharmacies_disponibles,
            })
        result.sort(key=lambda x: x['nom'])
        return result

    def list(self, request, *args, **kwargs):
        if self._pharmacist_pharmacy() is None:
            stocks = self._client_stocks_qs()
            search = request.query_params.get('search', '').strip()
            if search:
                stocks = stocks.filter(
                    Q(medicament__nom__icontains=search) |
                    Q(medicament__description__icontains=search) |
                    Q(medicament__principe_actif__icontains=search) |
                    Q(medicament__dosage__icontains=search)
                )
            return Response(self._stocks_to_grouped(stocks))
        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def par_categorie(self, request):
        categorie_id = request.query_params.get('categorie_id')
        if not categorie_id:
            return Response({"error": "categorie_id requis"}, status=400)
        if self._pharmacist_pharmacy() is None:
            stocks = self._client_stocks_qs().filter(medicament__categorie_id=categorie_id)
            return Response(self._stocks_to_grouped(stocks))
        medicaments = self.get_queryset().filter(categorie_id=categorie_id)
        serializer = MedicamentListSerializer(medicaments, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='pharmacies-proches')
    def pharmacies_proches(self, request):
        q = request.query_params.get('q', '').strip()
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        rayon = float(request.query_params.get('rayon', 50))

        if not q or lat is None or lng is None:
            return Response({'error': 'q, lat et lng sont requis'}, status=400)

        try:
            user_lat = float(lat)
            user_lng = float(lng)
        except ValueError:
            return Response({'error': 'lat/lng invalides'}, status=400)

        stocks = (
            Stock.objects
            .filter(
                quantite__gt=0,
                pharmacie__approval_status='APPROVED',
                pharmacie__is_active=True,
                medicament__is_active=True,
            )
            .filter(
                Q(medicament__nom__icontains=q) |
                Q(medicament__principe_actif__icontains=q) |
                Q(medicament__description__icontains=q)
            )
            .select_related('medicament__categorie', 'pharmacie')
        )

        candidates = []
        for s in stocks:
            ph = s.pharmacie
            if ph.latitude is None or ph.longitude is None:
                continue
            dist = _haversine(user_lat, user_lng, float(ph.latitude), float(ph.longitude))
            if dist <= rayon:
                candidates.append((dist, s))

        if not candidates:
            return Response({'medicament': q, 'results': []})

        candidates.sort(key=lambda x: x[0])

        MAX_OSRM = 5
        osrm_targets = candidates[:MAX_OSRM]
        osrm_results = {}

        def fetch_osrm(item):
            dist, s = item
            ph = s.pharmacie
            key = (ph.id, s.medicament_id)
            dur = _get_osrm_duration(user_lat, user_lng, float(ph.latitude), float(ph.longitude))
            return key, dur

        try:
            with ThreadPoolExecutor(max_workers=MAX_OSRM) as executor:
                futures = {executor.submit(fetch_osrm, ds): ds for ds in osrm_targets}
                for future in as_completed(futures, timeout=4):
                    try:
                        key, dur = future.result()
                        osrm_results[key] = dur
                    except Exception:
                        pass
        except Exception:
            pass

        results = []
        for dist, s in candidates:
            ph = s.pharmacie
            med = s.medicament
            key = (ph.id, med.id)
            duree = osrm_results.get(key)
            itineraire_url = (
                f"https://www.google.com/maps/dir/?api=1"
                f"&destination={ph.latitude},{ph.longitude}"
            )
            results.append({
                'pharmacie_id': ph.id,
                'medicament_id': med.id,
                'stock_id': s.id,
                'pharmacie': ph.nom_pharmacie,
                'medicament_nom': med.nom + (' ' + med.dosage if med.dosage else ''),
                'ville': ph.ville,
                'telephone': ph.telephone,
                'quantite': s.quantite,
                'prix': str(s.prix_vente if s.prix_vente is not None else med.prix),
                'distance_km': round(dist, 2),
                'distance': str(round(dist, 1)),
                'duree_minutes': duree,
                'horaires_ouverture': ph.horaires_ouverture,
                'latitude': float(ph.latitude),
                'longitude': float(ph.longitude),
                'itineraire_url': itineraire_url,
                'is_best_choice': False,
            })

        def sort_key(r):
            if r['duree_minutes'] is not None:
                return (0, r['duree_minutes'])
            return (1, r['distance_km'])

        results.sort(key=sort_key)
        if results:
            results[0]['is_best_choice'] = True

        return Response({'medicament': q, 'results': results})
