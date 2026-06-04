from django.contrib import admin
from .models import Categorie, Medicament


@admin.register(Categorie)
class CategorieAdmin(admin.ModelAdmin):
    list_display = ['nom', 'couleur', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['nom', 'description']
    ordering = ['nom']


@admin.register(Medicament)
class MedicamentAdmin(admin.ModelAdmin):
    list_display = [
        'nom', 
        'categorie', 
        'dosage', 
        'prix', 
        'ordonnance_requise', 
        'is_active'
    ]
    list_filter = ['categorie', 'ordonnance_requise', 'is_active', 'forme']
    search_fields = ['nom', 'principe_actif', 'code_barre']
    ordering = ['nom']
    list_editable = ['prix', 'is_active']
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('nom', 'description', 'categorie', 'image')
        }),
        ('Détails', {
            'fields': ('principe_actif', 'dosage', 'forme', 'prix')
        }),
        ('Informations médicales', {
            'fields': ('ordonnance_requise', 'posologie', 'contre_indications', 'effets_secondaires')
        }),
        ('Métadonnées', {
            'fields': ('code_barre', 'is_active')
        }),
    )