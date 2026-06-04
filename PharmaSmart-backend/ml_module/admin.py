from django.contrib import admin

from .models import LowSellerReport, ModelMetrics, SalesPrediction, TrainingRun


@admin.register(TrainingRun)
class TrainingRunAdmin(admin.ModelAdmin):
    list_display  = ['id', 'pharmacie', 'statut', 'nb_echantillons', 'duree_secondes', 'created_at']
    list_filter   = ['statut']
    readonly_fields = ['created_at', 'completed_at', 'medicaments_entraines']
    search_fields = ['pharmacie__nom_pharmacie']


@admin.register(ModelMetrics)
class ModelMetricsAdmin(admin.ModelAdmin):
    list_display  = ['id', 'modele', 'medicament', 'pharmacie', 'mae', 'rmse', 'mape', 'n_samples', 'created_at']
    list_filter   = ['modele']
    readonly_fields = ['created_at']
    search_fields = ['medicament__nom', 'pharmacie__nom_pharmacie']


@admin.register(SalesPrediction)
class SalesPredictionAdmin(admin.ModelAdmin):
    list_display  = ['id', 'pharmacie', 'medicament', 'modele', 'date_prediction', 'quantite_predite']
    list_filter   = ['modele']
    readonly_fields = ['created_at']
    search_fields = ['medicament__nom']


@admin.register(LowSellerReport)
class LowSellerReportAdmin(admin.ModelAdmin):
    list_display  = ['id', 'pharmacie', 'medicament', 'periode_jours', 'quantite_totale', 'tendance', 'score_risque']
    list_filter   = ['tendance', 'periode_jours']
    readonly_fields = ['created_at']
    search_fields = ['medicament__nom']
