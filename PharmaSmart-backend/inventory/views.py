from collections import defaultdict

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from authentication.permissions import IsPharmacien
from .models import Fournisseur, Stock, Promotion
from .serializers import (
    FournisseurSerializer,
    StockSerializer,
    StockListSerializer,
    PromotionSerializer
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _pharmacie_from_user(user):
    """Return the PharmacyProfile linked to this user, or None."""
    if hasattr(user, 'pharmacy_profile'):
        return user.pharmacy_profile
    if hasattr(user, 'personnel_profile'):
        return user.personnel_profile.pharmacie
    return None


# -------------------------
# FOURNISSEURS
# -------------------------
class FournisseurViewSet(viewsets.ModelViewSet):
    queryset = Fournisseur.objects.filter(is_active=True)
    serializer_class = FournisseurSerializer
    permission_classes = [IsPharmacien]


# -------------------------
# STOCK (LOCAL - pharmacie)
# -------------------------
class StockViewSet(viewsets.ModelViewSet):
    serializer_class = StockSerializer
    permission_classes = [IsPharmacien]

    def _get_pharmacie(self):
        return _pharmacie_from_user(self.request.user)

    def get_queryset(self):
        """
        Strictly scoped: returns only stock rows that belong to the requesting
        pharmacist's pharmacy. get_object() inherits this queryset, so retrieve,
        update, partial_update, destroy, and ajuster are all automatically
        isolated — a pharmacist cannot touch another pharmacy's stock even if
        they know the row's pk.
        """
        pharmacie = self._get_pharmacie()
        if pharmacie:
            return Stock.objects.filter(pharmacie=pharmacie).select_related(
                'medicament', 'pharmacie', 'fournisseur'
            )
        return Stock.objects.none()

    def get_serializer_class(self):
        if self.action == 'list':
            return StockListSerializer
        return StockSerializer

    def perform_create(self, serializer):
        pharmacie = self._get_pharmacie()
        if pharmacie is None:
            raise PermissionDenied("Vous n'êtes pas associé à une pharmacie.")
        if pharmacie.approval_status != 'APPROVED':
            raise PermissionDenied("Votre pharmacie doit être approuvée avant d'ajouter du stock.")

        # Duplicate check only applies when an existing medication ID is supplied.
        # When medicament_name is given, a brand-new medication is created so
        # there can be no pre-existing stock entry for it.
        existing_med = serializer.validated_data.get('medicament')
        if existing_med and Stock.objects.filter(pharmacie=pharmacie, medicament=existing_med).exists():
            raise ValidationError("Ce médicament existe déjà dans votre stock. Utilisez l'action 'ajuster' pour modifier la quantité.")

        serializer.save(pharmacie=pharmacie)

    @action(detail=False, methods=['get'])
    def alertes(self, request):
        queryset = self.get_queryset()
        alertes = [s for s in queryset if s.is_low_stock or s.is_out_of_stock]
        serializer = StockListSerializer(alertes, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def ajuster(self, request, pk=None):
        stock = self.get_object()
        quantite = request.data.get('quantite')

        if quantite is not None:
            stock.quantite = int(quantite)
            stock.save()
            return Response(StockSerializer(stock).data)

        return Response(
            {"error": "quantite requise"},
            status=status.HTTP_400_BAD_REQUEST
        )


# -------------------------
# PROMOTIONS
# -------------------------
class PromotionViewSet(viewsets.ModelViewSet):
    serializer_class = PromotionSerializer

    def get_permissions(self):
        if self.action == 'list':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        if self.action == 'list':
            return Promotion.objects.filter(is_active=True)

        user = self.request.user
        if hasattr(user, 'pharmacy_profile'):
            return Promotion.objects.filter(pharmacie=user.pharmacy_profile)
        return Promotion.objects.none()

    @action(detail=False, methods=['get'])
    def actives(self, request):
        promotions = [p for p in self.get_queryset() if p.is_valid]
        serializer = PromotionSerializer(promotions, many=True)
        return Response(serializer.data)


# -------------------------
# 🔥 CENTRALISATION GLOBALE
# -------------------------
class GlobalStockViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Retourne le stock global par médicament (toutes pharmacies)
    """
    serializer_class = StockSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        queryset = Stock.objects.filter(
            pharmacie__is_active=True,
            pharmacie__approval_status='APPROVED'
        ).select_related('medicament', 'pharmacie')

        name = self.request.query_params.get('name')

        if name:
            queryset = queryset.filter(medicament__nom__icontains=name)

        return queryset

    def list(self, request, *args, **kwargs):
        stocks = self.get_queryset()

        grouped = defaultdict(lambda: {
            "medicament": "",
            "total_stock": 0,
            "details": []
        })

        for s in stocks:
            med_name = s.medicament.nom

            grouped[med_name]["medicament"] = med_name
            grouped[med_name]["total_stock"] += s.quantite

            grouped[med_name]["details"].append({
                "pharmacie": s.pharmacie.nom_pharmacie,
                "quantite": s.quantite
            })

        # Trier par quantité décroissante
        result = sorted(
            grouped.values(),
            key=lambda x: x['total_stock'],
            reverse=True
        )

        return Response(result)