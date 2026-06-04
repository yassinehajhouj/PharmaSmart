from rest_framework import serializers

from .models import TrainingRun, ModelMetrics, SalesPrediction, LowSellerReport


class TrainingRunSerializer(serializers.ModelSerializer):
    pharmacie_nom = serializers.SerializerMethodField()
    statut_display = serializers.CharField(source='get_statut_display', read_only=True)

    class Meta:
        model = TrainingRun
        fields = [
            'id', 'pharmacie', 'pharmacie_nom', 'statut', 'statut_display',
            'medicaments_entraines', 'nb_echantillons',
            'erreur', 'duree_secondes', 'created_at', 'completed_at',
        ]

    def get_pharmacie_nom(self, obj):
        return obj.pharmacie.nom_pharmacie if obj.pharmacie else 'Toutes'


class ModelMetricsSerializer(serializers.ModelSerializer):
    medicament_nom = serializers.SerializerMethodField()
    modele_display = serializers.SerializerMethodField()

    class Meta:
        model = ModelMetrics
        fields = [
            'id', 'modele', 'modele_display', 'medicament', 'medicament_nom',
            'mae', 'rmse', 'mape', 'n_samples', 'created_at',
        ]

    def get_medicament_nom(self, obj):
        return obj.medicament.nom if obj.medicament else 'Global'

    def get_modele_display(self, obj):
        labels = {'xgboost': 'XGBoost', 'random_forest': 'Random Forest'}
        return labels.get(obj.modele, obj.modele)


class SalesPredictionSerializer(serializers.ModelSerializer):
    medicament_nom = serializers.SerializerMethodField()

    class Meta:
        model = SalesPrediction
        fields = [
            'id', 'medicament', 'medicament_nom', 'modele',
            'date_prediction', 'quantite_predite',
            'borne_basse', 'borne_haute', 'horizon_jours', 'created_at',
        ]

    def get_medicament_nom(self, obj):
        return obj.medicament.nom


class LowSellerReportSerializer(serializers.ModelSerializer):
    medicament_nom = serializers.SerializerMethodField()
    medicament_categorie = serializers.SerializerMethodField()

    class Meta:
        model = LowSellerReport
        fields = [
            'id', 'medicament', 'medicament_nom', 'medicament_categorie',
            'periode_jours', 'quantite_totale', 'quantite_moyenne_journaliere',
            'jours_depuis_derniere_vente', 'tendance', 'score_risque', 'created_at',
        ]

    def get_medicament_nom(self, obj):
        return obj.medicament.nom

    def get_medicament_categorie(self, obj):
        if obj.medicament and obj.medicament.categorie:
            return obj.medicament.categorie.nom
        return ''
