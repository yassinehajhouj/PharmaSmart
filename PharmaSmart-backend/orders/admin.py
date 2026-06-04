from django.contrib import admin
from .models import Panier, ItemPanier, Commande, LigneCommande, Ordonnance


class ItemPanierInline(admin.TabularInline):
    """Affiche les items dans le panier."""
    model = ItemPanier
    extra = 0
    readonly_fields = ['sous_total']


@admin.register(Panier)
class PanierAdmin(admin.ModelAdmin):
    list_display = ['user', 'nombre_items', 'total', 'updated_at']
    search_fields = ['user__username']
    inlines = [ItemPanierInline]


class LigneCommandeInline(admin.TabularInline):
    """Affiche les lignes dans la commande."""
    model = LigneCommande
    extra = 0
    readonly_fields = ['sous_total']


@admin.register(Commande)
class CommandeAdmin(admin.ModelAdmin):
    list_display = [
        'numero',
        'patient',
        'pharmacie',
        'statut',
        'total',
        'mode_livraison',
        'created_at'
    ]
    list_filter = ['statut', 'mode_livraison', 'pharmacie', 'created_at']
    search_fields = ['numero', 'patient__username', 'pharmacie__nom_pharmacie']
    ordering = ['-created_at']
    readonly_fields = ['numero', 'created_at', 'updated_at']
    inlines = [LigneCommandeInline]
    
    fieldsets = (
        ('Informations générales', {
            'fields': ('numero', 'patient', 'pharmacie', 'statut')
        }),
        ('Livraison', {
            'fields': ('mode_livraison', 'adresse_livraison')
        }),
        ('Montants', {
            'fields': ('sous_total', 'frais_livraison', 'total')
        }),
        ('Ordonnance', {
            'fields': ('ordonnance',)
        }),
        ('Notes et dates', {
            'fields': ('notes', 'created_at', 'confirmed_at', 'delivered_at')
        }),
    )


@admin.register(Ordonnance)
class OrdonnanceAdmin(admin.ModelAdmin):
    list_display = [
        'patient',
        'pharmacie',
        'statut',
        'medecin',
        'date_prescription',
        'created_at'
    ]
    list_filter = ['statut', 'pharmacie', 'created_at']
    search_fields = ['patient__username', 'medecin']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'validated_at']