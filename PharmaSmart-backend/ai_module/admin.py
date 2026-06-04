from django.contrib import admin
from .models import Conversation, Message, Prediction, OllamaConfig


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ['role', 'contenu', 'tokens_used', 'created_at']


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ['user', 'titre', 'is_active', 'created_at', 'updated_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['user__username', 'titre']
    ordering = ['-updated_at']
    inlines = [MessageInline]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['conversation', 'role', 'contenu_court', 'tokens_used', 'created_at']
    list_filter = ['role', 'created_at']
    search_fields = ['contenu']
    ordering = ['-created_at']
    
    def contenu_court(self, obj):
        return obj.contenu[:50] + "..." if len(obj.contenu) > 50 else obj.contenu
    contenu_court.short_description = "Contenu"


@admin.register(Prediction)
class PredictionAdmin(admin.ModelAdmin):
    list_display = [
        'pharmacie',
        'medicament',
        'type_prediction',
        'valeur_predite',
        'confiance',
        'created_at'
    ]
    list_filter = ['type_prediction', 'pharmacie', 'created_at']
    search_fields = ['pharmacie__nom_pharmacie', 'medicament__nom']
    ordering = ['-created_at']


@admin.register(OllamaConfig)
class OllamaConfigAdmin(admin.ModelAdmin):
    list_display = ['nom', 'modele', 'url_ollama', 'temperature', 'is_active']
    list_filter = ['is_active', 'modele']
    search_fields = ['nom']
