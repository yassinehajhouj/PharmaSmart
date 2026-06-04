from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer pour les notifications."""
    
    type_display = serializers.CharField(source='get_type_notification_display', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id',
            'type_notification',
            'type_display',
            'titre',
            'message',
            'lien',
            'is_read',
            'read_at',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'read_at']