from rest_framework import serializers
from .models import PharmacyProfile, Personnel
from authentication.serializers import UserSerializer


class PharmacyProfileSerializer(serializers.ModelSerializer):
    """Serializer pour le profil pharmacie."""
    
    user = UserSerializer(read_only=True)
    approval_status_display = serializers.CharField(
        source='get_approval_status_display',
        read_only=True
    )
    
    class Meta:
        model = PharmacyProfile
        fields = [
            'id',
            'user',
            'nom_pharmacie',
            'numero_autorisation',
            'adresse',
            'ville',
            'code_postal',
            'telephone',
            'email_pharmacie',
            'diplome',
            'autorisation_exercice',
            'registre_commerce',
            'approval_status',
            'approval_status_display',
            'horaires_ouverture',
            'is_active',
            'created_at',
        ]
        read_only_fields = ['id', 'user', 'approval_status', 'created_at']


class PharmacyRegisterSerializer(serializers.ModelSerializer):
    """Serializer pour l'inscription d'une pharmacie."""
    
    class Meta:
        model = PharmacyProfile
        fields = [
            'nom_pharmacie',
            'numero_autorisation',
            'adresse',
            'ville',
            'code_postal',
            'telephone',
            'email_pharmacie',
            'diplome',
            'autorisation_exercice',
            'registre_commerce',
            'horaires_ouverture',
        ]


class PersonnelSerializer(serializers.ModelSerializer):
    """Serializer pour le personnel."""
    
    user = UserSerializer(read_only=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = Personnel
        fields = [
            'id',
            'user',
            'pharmacie',
            'role',
            'role_display',
            'date_embauche',
            'is_active',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']