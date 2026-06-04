from django.contrib import admin
from .models import Fournisseur, Stock, Promotion


@admin.register(Fournisseur)
class FournisseurAdmin(admin.ModelAdmin):
    list_display = ['nom', 'contact', 'telephone', 'ville', 'is_active']
    list_filter = ['is_active', 'ville']
    search_fields = ['nom', 'contact', 'email']
    ordering = ['nom']


@admin.register(Stock)
class StockAdmin(admin.ModelAdmin):
    list_display = [
        'medicament',
        'pharmacie',
        'quantite',
        'seuil_alerte',
        'is_low_stock_display',
        'date_expiration'
    ]
    list_filter = ['pharmacie', 'medicament__categorie', 'fournisseur']
    search_fields = ['medicament__nom', 'pharmacie__nom_pharmacie']
    ordering = ['-updated_at']
    list_editable = ['quantite', 'seuil_alerte']
    
    def is_low_stock_display(self, obj):
        """Affiche un indicateur de stock bas."""
        if obj.is_out_of_stock:
            return "🔴 Rupture"
        elif obj.is_low_stock:
            return "🟡 Bas"
        return "🟢 OK"
    is_low_stock_display.short_description = "État stock"


@admin.register(Promotion)
class PromotionAdmin(admin.ModelAdmin):
    list_display = [
        'medicament',
        'pharmacie',
        'pourcentage_reduction',
        'date_debut',
        'date_fin',
        'is_active'
    ]
    list_filter = ['is_active', 'pharmacie', 'pourcentage_reduction']
    search_fields = ['medicament__nom', 'pharmacie__nom_pharmacie']
    ordering = ['-date_debut']
    list_editable = ['is_active']