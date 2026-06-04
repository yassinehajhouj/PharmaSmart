import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from asgiref.sync import sync_to_async


class NotificationConsumer(AsyncWebsocketConsumer):
    """Consumer WebSocket pour les notifications en temps réel."""

    async def connect(self):
        """Connexion WebSocket."""
        self.user = self.scope["user"]
        
        if self.user.is_anonymous:
            # Rejeter la connexion si non authentifié
            await self.close()
            return
        
        # Créer un groupe unique pour cet utilisateur
        self.room_group_name = f"user_{self.user.id}"
        
        # Rejoindre le groupe
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Envoyer les notifications non lues au connexion
        notifications = await self.get_unread_notifications()
        await self.send(text_data=json.dumps({
            'type': 'initial',
            'notifications': notifications,
            'count': len(notifications)
        }))

    async def disconnect(self, close_code):
        """Déconnexion WebSocket."""
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        """Recevoir un message du client."""
        data = json.loads(text_data)
        action = data.get('action')
        
        if action == 'mark_read':
            notification_id = data.get('notification_id')
            await self.mark_notification_read(notification_id)
            await self.send(text_data=json.dumps({
                'type': 'marked_read',
                'notification_id': notification_id
            }))
        
        elif action == 'mark_all_read':
            await self.mark_all_read()
            await self.send(text_data=json.dumps({
                'type': 'all_marked_read'
            }))
        
        elif action == 'get_count':
            count = await self.get_unread_count()
            await self.send(text_data=json.dumps({
                'type': 'count',
                'count': count
            }))

    async def notification_message(self, event):
        """Envoyer une notification au client."""
        await self.send(text_data=json.dumps({
            'type': 'new_notification',
            'notification': event['notification']
        }))

    @database_sync_to_async
    def get_unread_notifications(self):
        """Récupérer les notifications non lues."""
        from .models import Notification
        notifications = Notification.objects.filter(
            user=self.user,
            is_read=False
        ).order_by('-created_at')[:10]
        
        return [
            {
                'id': n.id,
                'titre': n.titre,
                'message': n.message,
                'type': n.type_notification,
                'created_at': n.created_at.isoformat(),
                'is_read': n.is_read
            }
            for n in notifications
        ]

    @database_sync_to_async
    def get_unread_count(self):
        """Compter les notifications non lues."""
        from .models import Notification
        return Notification.objects.filter(
            user=self.user,
            is_read=False
        ).count()

    @database_sync_to_async
    def mark_notification_read(self, notification_id):
        """Marquer une notification comme lue."""
        from .models import Notification
        try:
            notification = Notification.objects.get(
                id=notification_id,
                user=self.user
            )
            notification.is_read = True
            notification.save()
        except Notification.DoesNotExist:
            pass

    @database_sync_to_async
    def mark_all_read(self):
        """Marquer toutes les notifications comme lues."""
        from .models import Notification
        Notification.objects.filter(
            user=self.user,
            is_read=False
        ).update(is_read=True)