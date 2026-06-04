from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    """API endpoint pour les notifications."""
    
    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get'])
    def non_lues(self, request):
        """Retourne les notifications non lues."""
        notifications = self.get_queryset().filter(is_read=False)
        serializer = NotificationSerializer(notifications, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def count(self, request):
        """Retourne le nombre de notifications non lues."""
        count = self.get_queryset().filter(is_read=False).count()
        return Response({"count": count})
    
    @action(detail=True, methods=['post'])
    def marquer_lu(self, request, pk=None):
        """Marque une notification comme lue."""
        notification = self.get_object()
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save()
        return Response(NotificationSerializer(notification).data)
    
    @action(detail=False, methods=['post'])
    def tout_marquer_lu(self, request):
        """Marque toutes les notifications comme lues."""
        self.get_queryset().filter(is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        return Response({"message": "Toutes les notifications marquées comme lues"})

    @action(detail=False, methods=['post'], url_path='ping')
    def ping(self, request):
        """Envoie une notification de test temps réel à l'utilisateur connecté."""
        from .utils import send_notification
        send_notification(
            user=request.user,
            titre='🔔 WebSocket opérationnel',
            message='Connexion temps réel confirmée — vous recevez ce message via WebSocket.',
            type_notification='SUCCESS',
        )
        return Response({'status': 'sent'})