from rest_framework import serializers
from .models import PatientProfile
from authentication.serializers import UserSerializer


class PatientProfileSerializer(serializers.ModelSerializer):
    """Serializer pour le profil patient."""
    
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = PatientProfile
        fields = [
            'id',
            'user',
            'numero_securite_sociale',
            'allergies',
            'antecedents_medicaux',
            'medecin_traitant',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at']