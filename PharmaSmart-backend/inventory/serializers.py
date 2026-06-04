from django.db.models import Q
from rest_framework import serializers

from catalog.models import Categorie, Medicament
from .models import Fournisseur, Stock, Promotion


class FournisseurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fournisseur
        fields = ['id', 'nom', 'contact', 'email', 'telephone', 'adresse', 'ville', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']


class StockSerializer(serializers.ModelSerializer):
    # ── read-only display fields ──────────────────────────────────────────────
    medicament_nom  = serializers.CharField(source='medicament.nom', read_only=True)
    pharmacie_nom   = serializers.CharField(source='pharmacie.nom_pharmacie', read_only=True)
    is_low_stock    = serializers.BooleanField(read_only=True)
    is_out_of_stock = serializers.BooleanField(read_only=True)
    prix_effectif   = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)

    # ── write-only creation fields ────────────────────────────────────────────
    # Provide EITHER medicament (existing ID) OR medicament_name (new local med).
    medicament_name = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=False,
        help_text="Nom d'un nouveau médicament local. Mutuellement exclusif avec 'medicament'.",
    )
    medicament_prix = serializers.DecimalField(
        write_only=True,
        required=False,
        max_digits=10,
        decimal_places=2,
        min_value=0,
        help_text="Prix du nouveau médicament local (optionnel, défaut 0).",
    )
    medicament_image = serializers.ImageField(
        write_only=True,
        required=False,
        allow_null=True,
        help_text="Image du nouveau médicament local (obligatoire pour un nouveau médicament).",
    )

    class Meta:
        model = Stock
        fields = [
            'id',
            'pharmacie', 'pharmacie_nom',
            'medicament', 'medicament_nom',
            'medicament_name', 'medicament_prix', 'medicament_image',  # write-only new-med fields
            'fournisseur',
            'quantite', 'seuil_alerte',
            'prix_vente', 'prix_effectif',
            'date_expiration', 'emplacement',
            'is_low_stock', 'is_out_of_stock',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'pharmacie', 'created_at', 'updated_at']
        extra_kwargs = {
            # medicament is optional when medicament_name is used instead
            'medicament': {'required': False},
        }

    # ── dynamic queryset: only global meds + this pharmacy's local meds ───────

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        pharmacie = self._pharmacie_from_context()
        if pharmacie is not None:
            self.fields['medicament'].queryset = Medicament.objects.filter(
                Q(pharmacie__isnull=True) | Q(pharmacie=pharmacie)
            )

    def _pharmacie_from_context(self):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        user = request.user
        if hasattr(user, 'pharmacy_profile'):
            return user.pharmacy_profile
        if hasattr(user, 'personnel_profile'):
            return user.personnel_profile.pharmacie
        return None

    # ── validation ────────────────────────────────────────────────────────────

    def validate(self, attrs):
        has_id    = 'medicament' in attrs
        has_name  = bool(attrs.get('medicament_name', '').strip())
        has_image = attrs.get('medicament_image') is not None

        if not has_id and not has_name:
            raise serializers.ValidationError(
                "Fournissez soit 'medicament' (ID) soit 'medicament_name' (nouveau médicament)."
            )
        if has_id and has_name:
            raise serializers.ValidationError(
                "Fournissez 'medicament' OU 'medicament_name', pas les deux."
            )
        # Image is required when creating a new local medication.
        if has_name and not has_image:
            raise serializers.ValidationError(
                "Une image est requise pour créer un nouveau médicament."
            )
        return attrs

    # ── creation ──────────────────────────────────────────────────────────────

    def create(self, validated_data):
        medicament_name  = validated_data.pop('medicament_name', None)
        medicament_prix  = validated_data.pop('medicament_prix', 0)
        medicament_image = validated_data.pop('medicament_image', None)

        if medicament_name:
            pharmacie = validated_data['pharmacie']

            # Reuse or create the sentinel category for local medications.
            categorie, _ = Categorie.objects.get_or_create(
                nom='Médicament local',
                defaults={
                    'description': 'Médicaments créés directement par les pharmacies.',
                    'is_active': True,
                },
            )

            # Local medication — scoped to this pharmacy only.
            # Never touch the image of an existing catalog medication.
            medicament = Medicament.objects.create(
                nom=medicament_name.strip(),
                pharmacie=pharmacie,
                categorie=categorie,
                prix=medicament_prix,
                image=medicament_image,
            )
            validated_data['medicament'] = medicament

        # Stock creation never modifies the linked Medicament's image.
        return Stock.objects.create(**validated_data)


class StockListSerializer(serializers.ModelSerializer):
    medicament_nom  = serializers.CharField(source='medicament.nom', read_only=True)
    is_low_stock    = serializers.BooleanField(read_only=True)
    is_out_of_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Stock
        fields = [
            'id', 'medicament', 'medicament_nom',
            'quantite', 'seuil_alerte',
            'is_low_stock', 'is_out_of_stock',
            'date_expiration',
        ]


class PromotionSerializer(serializers.ModelSerializer):
    medicament_nom = serializers.CharField(source='medicament.nom', read_only=True)
    pharmacie_nom  = serializers.CharField(source='pharmacie.nom_pharmacie', read_only=True)
    is_valid       = serializers.BooleanField(read_only=True)

    class Meta:
        model = Promotion
        fields = [
            'id', 'pharmacie', 'pharmacie_nom',
            'medicament', 'medicament_nom',
            'pourcentage_reduction', 'date_debut', 'date_fin',
            'description', 'is_active', 'is_valid', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']
