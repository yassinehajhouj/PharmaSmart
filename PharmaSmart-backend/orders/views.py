from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
from .models import Panier, ItemPanier, Commande, LigneCommande, Ordonnance
from .serializers import (
    PanierSerializer,
    ItemPanierSerializer,
    CommandeSerializer,
    CommandeListSerializer,
    OrdonnanceSerializer
)
from catalog.models import Medicament
from inventory.models import Stock
from notifications.utils import notify_order_status_change, notify_new_order



class PanierViewSet(viewsets.ModelViewSet):
    """API endpoint pour le panier."""

    serializer_class = PanierSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Panier.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def mon_panier(self, request):
        """Retourne le panier de l'utilisateur."""
        panier, created = Panier.objects.get_or_create(user=request.user)
        serializer = PanierSerializer(panier)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def ajouter(self, request):
        """Ajoute un item au panier."""
        panier, _ = Panier.objects.get_or_create(user=request.user)

        # Accepter soit stock_id soit medicament_id
        stock_id = request.data.get('stock_id')
        medicament_id = request.data.get('medicament_id')
        quantite = request.data.get('quantite', 1)

        if not stock_id and not medicament_id:
            return Response(
                {"error": "stock_id ou medicament_id requis"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Si on reçoit medicament_id, trouver le meilleur stock disponible
        if medicament_id and not stock_id:
            try:
                Medicament.objects.get(id=medicament_id)
            except Medicament.DoesNotExist:
                return Response(
                    {"error": "Médicament non trouvé"},
                    status=status.HTTP_404_NOT_FOUND
                )

            stock = Stock.objects.filter(
                medicament_id=medicament_id,
                quantite__gt=0,
                pharmacie__is_active=True,
                pharmacie__approval_status='APPROVED',
            ).select_related('pharmacie').order_by('-quantite').first()

            if not stock:
                return Response(
                    {"error": "Ce médicament n'est pas disponible en stock actuellement"},
                    status=status.HTTP_404_NOT_FOUND
                )

            stock_id = stock.id

        # Vérifier si l'item existe déjà
        item, created = ItemPanier.objects.get_or_create(
            panier=panier,
            stock_id=stock_id,
            defaults={'quantite': quantite}
        )

        if not created:
            item.quantite += int(quantite)
            item.save()

        return Response({
            "message": "Produit ajouté au panier",
            "panier": PanierSerializer(panier).data
        })

    @action(detail=False, methods=['post'])
    def retirer(self, request):
        """Retire un item du panier."""
        try:
            panier = Panier.objects.get(user=request.user)
        except Panier.DoesNotExist:
            return Response(
                {"error": "Panier non trouvé"},
                status=status.HTTP_404_NOT_FOUND
            )

        item_id = request.data.get('item_id')

        try:
            item = ItemPanier.objects.get(id=item_id, panier=panier)
            item.delete()
            return Response(PanierSerializer(panier).data)
        except ItemPanier.DoesNotExist:
            return Response(
                {"error": "Item non trouvé"},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['post'])
    def vider(self, request):
        """Vide le panier."""
        try:
            panier = Panier.objects.get(user=request.user)
            panier.items.all().delete()
            return Response(PanierSerializer(panier).data)
        except Panier.DoesNotExist:
            return Response({"message": "Panier déjà vide"})

    @action(detail=False, methods=['get'])
    def pharmacies_disponibles(self, request):
        """Retourne les pharmacies qui ont tous les produits du panier en stock."""
        try:
            panier = Panier.objects.get(user=request.user)
        except Panier.DoesNotExist:
            return Response([])

        if panier.items.count() == 0:
            return Response([])

        # Récupérer les IDs des médicaments dans le panier
        medicament_ids = set()
        for item in panier.items.all():
            medicament_ids.add(item.stock.medicament_id)

        # Trouver les pharmacies qui ont TOUS ces médicaments en stock
        from pharmacies.models import PharmacyProfile
        from django.db.models import Count

        # Pharmacies avec au moins un des médicaments
        pharmacies_with_stock = Stock.objects.filter(
            medicament_id__in=medicament_ids,
            quantite__gt=0
        ).values('pharmacie').annotate(
            med_count=Count('medicament', distinct=True)
        ).filter(
            med_count=len(medicament_ids)  # Doit avoir TOUS les médicaments
        ).values_list('pharmacie', flat=True)

        # Récupérer les détails des pharmacies
        pharmacies = PharmacyProfile.objects.filter(
            id__in=pharmacies_with_stock,
            approval_status='APPROVED',
            is_active=True
        )

        # Formater la réponse
        from pharmacies.serializers import PharmacyProfileSerializer
        serializer = PharmacyProfileSerializer(pharmacies, many=True)

        return Response(serializer.data)


class CommandeViewSet(viewsets.ModelViewSet):
    """API endpoint pour les commandes."""

    serializer_class = CommandeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'PATIENT':
            return Commande.objects.filter(patient=user)
        elif user.user_type == 'PHARMACIEN' and hasattr(user, 'pharmacy_profile'):
            return Commande.objects.filter(pharmacie=user.pharmacy_profile)
        return Commande.objects.none()

    def get_serializer_class(self):
        if self.action == 'list':
            return CommandeListSerializer
        return CommandeSerializer

    # Statuts où le stock a déjà été décrémenté
    _STATUTS_STOCK_RESERVE = {'CONFIRMEE', 'EN_PREPARATION', 'PRETE', 'EN_LIVRAISON'}

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def changer_statut(self, request, pk=None):
        """Change le statut d'une commande."""
        commande = self.get_object()
        old_status = commande.statut
        nouveau_statut = request.data.get('statut')

        if nouveau_statut not in dict(Commande.StatutCommande.choices):
            return Response({"error": "Statut invalide"}, status=status.HTTP_400_BAD_REQUEST)

        if old_status == nouveau_statut:
            return Response({"error": "Statut identique"}, status=status.HTTP_400_BAD_REQUEST)

        # ── EN_ATTENTE → CONFIRMEE : décrémenter le stock ──────────────────
        if nouveau_statut == 'CONFIRMEE' and old_status == 'EN_ATTENTE':
            for ligne in commande.lignes.select_related('medicament').all():
                try:
                    stock = Stock.objects.select_for_update().get(
                        pharmacie=commande.pharmacie,
                        medicament=ligne.medicament,
                    )
                except Stock.DoesNotExist:
                    return Response(
                        {"error": f"Stock introuvable : {ligne.medicament.nom}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                if stock.quantite < ligne.quantite:
                    return Response(
                        {"error": f"Stock insuffisant : {ligne.medicament.nom} "
                                  f"(disponible : {stock.quantite}, demandé : {ligne.quantite})"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                stock.decremente(ligne.quantite)

        # ── * → ANNULEE : restaurer le stock si déjà décrémenté ────────────
        elif nouveau_statut == 'ANNULEE' and old_status in self._STATUTS_STOCK_RESERVE:
            for ligne in commande.lignes.select_related('medicament').all():
                try:
                    stock = Stock.objects.get(
                        pharmacie=commande.pharmacie,
                        medicament=ligne.medicament,
                    )
                    stock.restaure(ligne.quantite)
                except Stock.DoesNotExist:
                    pass  # stock supprimé entre-temps — on ignore

        commande.statut = nouveau_statut
        if nouveau_statut == 'CONFIRMEE':
            commande.confirmed_at = timezone.now()
        elif nouveau_statut == 'LIVREE':
            commande.delivered_at = timezone.now()
        commande.save()

        notify_order_status_change(commande, old_status, nouveau_statut)

        return Response(CommandeSerializer(commande).data)

    @action(detail=False, methods=['post'])
    @transaction.atomic
    def creer_depuis_panier(self, request):
        """Crée une commande depuis le panier."""
        user = request.user
        pharmacie_id = request.data.get('pharmacie_id')
        mode_livraison = request.data.get('mode_livraison', 'RETRAIT')
        adresse_livraison = request.data.get('adresse_livraison', '')

        if not pharmacie_id:
            return Response(
                {"error": "pharmacie_id requis"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            panier = Panier.objects.prefetch_related('items__stock__medicament').get(user=user)
        except Panier.DoesNotExist:
            return Response({"error": "Panier vide"}, status=status.HTTP_400_BAD_REQUEST)

        if panier.items.count() == 0:
            return Response({"error": "Panier vide"}, status=status.HTTP_400_BAD_REQUEST)

        # Résoudre les stocks de la pharmacie cible pour chaque médicament du panier
        lignes_a_creer = []
        sous_total = 0

        for item in panier.items.all():
            medicament = item.stock.medicament
            try:
                stock_cible = Stock.objects.get(
                    pharmacie_id=pharmacie_id,
                    medicament=medicament,
                )
            except Stock.DoesNotExist:
                return Response(
                    {"error": f"{medicament.nom} n'est pas disponible dans cette pharmacie"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            prix = stock_cible.prix_effectif
            lignes_a_creer.append({
                "medicament": medicament,
                "quantite": item.quantite,
                "prix_unitaire": prix,
            })
            sous_total += prix * item.quantite

        frais_livraison = 0 if mode_livraison == 'RETRAIT' else 20
        commande = Commande.objects.create(
            patient=user,
            pharmacie_id=pharmacie_id,
            mode_livraison=mode_livraison,
            adresse_livraison=adresse_livraison,
            sous_total=sous_total,
            frais_livraison=frais_livraison,
            total=sous_total + frais_livraison,
        )

        for ligne in lignes_a_creer:
            LigneCommande.objects.create(commande=commande, **ligne)

        panier.items.all().delete()

        notify_new_order(commande)

        return Response(CommandeSerializer(commande).data, status=status.HTTP_201_CREATED)


class OrdonnanceViewSet(viewsets.ModelViewSet):
    """API endpoint pour les ordonnances."""

    serializer_class = OrdonnanceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.user_type == 'PATIENT':
            return Ordonnance.objects.filter(patient=user)
        elif user.user_type == 'PHARMACIEN' and hasattr(user, 'pharmacy_profile'):
            return Ordonnance.objects.filter(pharmacie=user.pharmacy_profile)
        return Ordonnance.objects.none()

    def perform_create(self, serializer):
        serializer.save(patient=self.request.user)

    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        """Valide une ordonnance."""
        ordonnance = self.get_object()
        ordonnance.statut = 'VALIDEE'
        ordonnance.validated_by = request.user
        ordonnance.validated_at = timezone.now()
        ordonnance.save()
        return Response(OrdonnanceSerializer(ordonnance).data)

    @action(detail=True, methods=['post'])
    def rejeter(self, request, pk=None):
        """Rejette une ordonnance."""
        ordonnance = self.get_object()
        ordonnance.statut = 'REJETEE'
        ordonnance.notes = request.data.get('motif', '')
        ordonnance.save()
        return Response(OrdonnanceSerializer(ordonnance).data)