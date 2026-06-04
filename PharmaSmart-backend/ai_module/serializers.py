from rest_framework import serializers
from .models import Conversation, Message, Prediction, OllamaConfig


class MessageSerializer(serializers.ModelSerializer):
    """Serializer pour les messages."""
    
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    class Meta:
        model = Message
        fields = [
            'id',
            'role',
            'role_display',
            'contenu',
            'tokens_used',
            'created_at',
        ]
        read_only_fields = ['id', 'tokens_used', 'created_at']


class ConversationSerializer(serializers.ModelSerializer):
    """Serializer pour les conversations."""
    
    messages = MessageSerializer(many=True, read_only=True)
    messages_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = [
            'id',
            'titre',
            'is_active',
            'messages',
            'messages_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_messages_count(self, obj):
        return obj.messages.count()


class ConversationListSerializer(serializers.ModelSerializer):
    """Serializer allégé pour la liste des conversations."""
    
    messages_count = serializers.SerializerMethodField()
    dernier_message = serializers.SerializerMethodField()
    
    class Meta:
        model = Conversation
        fields = [
            'id',
            'titre',
            'is_active',
            'messages_count',
            'dernier_message',
            'updated_at',
        ]
    
    def get_messages_count(self, obj):
        return obj.messages.count()
    
    def get_dernier_message(self, obj):
        last = obj.messages.last()
        if last:
            return last.contenu[:50] + "..." if len(last.contenu) > 50 else last.contenu
        return None


class PredictionSerializer(serializers.ModelSerializer):
    """Serializer pour les prédictions."""
    
    type_display = serializers.CharField(source='get_type_prediction_display', read_only=True)
    medicament_nom = serializers.CharField(source='medicament.nom', read_only=True)
    
    class Meta:
        model = Prediction
        fields = [
            'id',
            'pharmacie',
            'medicament',
            'medicament_nom',
            'type_prediction',
            'type_display',
            'valeur_predite',
            'unite',
            'confiance',
            'periode_debut',
            'periode_fin',
            'modele_utilise',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class OllamaConfigSerializer(serializers.ModelSerializer):
    """Serializer pour la configuration Ollama."""
    
    class Meta:
        model = OllamaConfig
        fields = [
            'id',
            'nom',
            'modele',
            'url_ollama',
            'system_prompt',
            'temperature',
            'max_tokens',
            'is_active',
        ]
        read_only_fields = ['id']


class ChatMessageSerializer(serializers.Serializer):
    """Serializer pour envoyer un message au chatbot."""
    
    message = serializers.CharField(required=True)
    conversation_id = serializers.IntegerField(required=False)
    medicament = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    intent = serializers.CharField(required=False, allow_blank=True, default='GENERAL')
