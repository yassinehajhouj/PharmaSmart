from rest_framework import serializers
from .models import Panier, ItemPanier, Commande, LigneCommande, Ordonnance
from catalog.serializers import MedicamentListSerializer


class ItemPanierSerializer(serializers.ModelSerializer):
    """Serializer pour les items du panier."""

    medicament_nom = serializers.CharField(source='stock.medicament.nom', read_only=True)
    medicament_image = serializers.SerializerMethodField()
    prix_unitaire = serializers.DecimalField(
        source='stock.prix_effectif',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    sous_total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    def get_medicament_image(self, obj):
        image = obj.stock.medicament.image
        if not image:
            return None
        request = self.context.get('request')
        return request.build_absolute_uri(image.url) if request else image.url

    class Meta:
        model = ItemPanier
        fields = [
            'id',
            'stock',
            'medicament_nom',
            'medicament_image',
            'quantite',
            'prix_unitaire',
            'sous_total',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class PanierSerializer(serializers.ModelSerializer):
    """Serializer pour le panier."""
    
    items = ItemPanierSerializer(many=True, read_only=True)
    total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    nombre_items = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Panier
        fields = [
            'id',
            'user',
            'items',
            'nombre_items',
            'total',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']


class LigneCommandeSerializer(serializers.ModelSerializer):
    """Serializer pour les lignes de commande."""
    
    medicament_nom = serializers.CharField(source='medicament.nom', read_only=True)
    
    class Meta:
        model = LigneCommande
        fields = [
            'id',
            'medicament',
            'medicament_nom',
            'quantite',
            'prix_unitaire',
            'sous_total',
        ]
        read_only_fields = ['id', 'sous_total']


class CommandeSerializer(serializers.ModelSerializer):
    """Serializer pour les commandes."""
    
    lignes = LigneCommandeSerializer(many=True, read_only=True)
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    mode_livraison_display = serializers.CharField(source='get_mode_livraison_display', read_only=True)
    patient_nom = serializers.CharField(source='patient.username', read_only=True)
    pharmacie_nom = serializers.CharField(source='pharmacie.nom_pharmacie', read_only=True)
    
    class Meta:
        model = Commande
        fields = [
            'id',
            'numero',
            'patient',
            'patient_nom',
            'pharmacie',
            'pharmacie_nom',
            'statut',
            'statut_display',
            'mode_livraison',
            'mode_livraison_display',
            'adresse_livraison',
            'sous_total',
            'frais_livraison',
            'total',
            'notes',
            'ordonnance',
            'lignes',
            'created_at',
            'confirmed_at',
            'delivered_at',
        ]
        read_only_fields = [
            'id', 'numero', 'patient', 'sous_total',
            'total', 'created_at', 'confirmed_at', 'delivered_at'
        ]


class CommandeListSerializer(serializers.ModelSerializer):
    """Serializer allégé pour la liste des commandes."""
    
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    pharmacie_nom = serializers.CharField(source='pharmacie.nom_pharmacie', read_only=True)
    
    class Meta:
        model = Commande
        fields = [
            'id',
            'numero',
            'pharmacie_nom',
            'statut',
            'statut_display',
            'total',
            'created_at',
        ]


class OrdonnanceSerializer(serializers.ModelSerializer):
    """Serializer pour les ordonnances."""
    
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)
    patient_nom = serializers.CharField(source='patient.username', read_only=True)
    
    class Meta:
        model = Ordonnance
        fields = [
            'id',
            'patient',
            'patient_nom',
            'pharmacie',
            'fichier',
            'statut',
            'statut_display',
            'medecin',
            'date_prescription',
            'date_expiration',
            'notes',
            'validated_by',
            'validated_at',
            'created_at',
        ]
        read_only_fields = [
            'id', 'patient', 'statut', 'validated_by',
            'validated_at', 'created_at'
        ]