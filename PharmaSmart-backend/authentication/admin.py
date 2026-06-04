

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Configuration de l'admin pour le modèle User personnalisé."""
    
    list_display = ['username', 'email', 'user_type', 'is_active', 'created_at']
    list_filter = ['user_type', 'is_active', 'is_staff']
    search_fields = ['username', 'email', 'telephone']
    ordering = ['-created_at']
    
    # Champs affichés lors de l'édition
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Informations supplémentaires', {
            'fields': ('user_type', 'telephone', 'date_naissance', 'adresse', 'ville')
        }),
    )
    
    # Champs affichés lors de la création
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Informations supplémentaires', {
            'fields': ('user_type', 'telephone')
        }),
    )