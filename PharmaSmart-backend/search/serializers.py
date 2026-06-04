from rest_framework import serializers


class PharmacieStockSerializer(serializers.Serializer):
    pharmacie_id = serializers.IntegerField(source='pharmacie.id')
    nom_pharmacie = serializers.CharField(source='pharmacie.nom_pharmacie')
    ville = serializers.CharField(source='pharmacie.ville')
    telephone = serializers.CharField(source='pharmacie.telephone')
    quantite = serializers.IntegerField()
    prix_vente = serializers.DecimalField(
        max_digits=10, decimal_places=2, allow_null=True
    )
    date_expiration = serializers.DateField(allow_null=True)


class MedicamentSearchSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    nom = serializers.CharField()
    categorie = serializers.CharField(source='categorie.nom')
    principe_actif = serializers.CharField(allow_null=True)
    dosage = serializers.CharField(allow_null=True)
    forme = serializers.CharField(allow_null=True)
    prix = serializers.DecimalField(max_digits=10, decimal_places=2)
    ordonnance_requise = serializers.BooleanField()
    total_stock = serializers.IntegerField()
    disponible_dans = PharmacieStockSerializer(many=True, source='pharmacie_stocks')
