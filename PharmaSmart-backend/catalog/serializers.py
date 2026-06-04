from rest_framework import serializers
from .models import Categorie, Medicament


class CategorieSerializer(serializers.ModelSerializer):
    """Serializer pour les catégories."""
    
    medicaments_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Categorie
        fields = [
            'id',
            'nom',
            'description',
            'icone',
            'couleur',
            'is_active',
            'medicaments_count',
        ]
    
    def get_medicaments_count(self, obj):
        return obj.medicaments.count()


class MedicamentSerializer(serializers.ModelSerializer):
    """Serializer pour les médicaments."""
    
    categorie_nom = serializers.CharField(source='categorie.nom', read_only=True)
    
    class Meta:
        model = Medicament
        fields = [
            'id',
            'nom',
            'description',
            'categorie',
            'categorie_nom',
            'principe_actif',
            'dosage',
            'forme',
            'prix',
            'image',
            'ordonnance_requise',
            'posologie',
            'contre_indications',
            'effets_secondaires',
            'code_barre',
            'is_active',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class MedicamentListSerializer(serializers.ModelSerializer):
    """Serializer allégé pour les listes de médicaments."""
    
    categorie_nom = serializers.CharField(source='categorie.nom', read_only=True)
    
    class Meta:
        model = Medicament
        fields = [
            'id',
            'nom',
            'categorie_nom',
            'dosage',
            'prix',
            'image',
            'ordonnance_requise',
            'is_active',
        ]