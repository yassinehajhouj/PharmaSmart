from django.contrib import admin
from .models import PatientProfile


@admin.register(PatientProfile)
class PatientProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'numero_securite_sociale', 'medecin_traitant', 'created_at']
    search_fields = ['user__username', 'user__email', 'numero_securite_sociale']
    list_filter = ['created_at']
    ordering = ['-created_at']