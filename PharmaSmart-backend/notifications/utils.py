from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Notification


def send_notification(user, titre, message, type_notification='INFO', lien=None):
    """
    Envoie une notification à un utilisateur.
    - Sauvegarde en base de données
    - Envoie en temps réel via WebSocket
    """
    # Créer la notification en base
    notification = Notification.objects.create(
        user=user,
        titre=titre,
        message=message,
        type_notification=type_notification,
        lien=lien
    )
    
    # Envoyer via WebSocket
    channel_layer = get_channel_layer()
    
    async_to_sync(channel_layer.group_send)(
        f"user_{user.id}",
        {
            "type": "notification_message",
            "notification": {
                "id": notification.id,
                "titre": notification.titre,
                "message": notification.message,
                "type": notification.type_notification,
                "lien": notification.lien,
                "created_at": notification.created_at.isoformat(),
                "is_read": False
            }
        }
    )
    
    return notification


def notify_order_status_change(commande, old_status, new_status):
    """Notifie le patient d'un changement de statut de commande."""
    statuts = {
        'CONFIRMEE': 'Votre commande a été confirmée par la pharmacie.',
        'EN_PREPARATION': 'Votre commande est en cours de préparation.',
        'EN_LIVRAISON': 'Votre commande est en cours de livraison.',
        'LIVREE': 'Votre commande a été livrée avec succès !',
        'ANNULEE': 'Votre commande a été annulée.',
    }
    
    message = statuts.get(new_status, f'Statut mis à jour : {new_status}')
    
    send_notification(
        user=commande.patient,
        titre=f'Commande #{commande.numero or commande.id}',
        message=message,
        type_notification='COMMANDE',
        lien=f'/commande/{commande.id}'
    )


def notify_new_order(commande):
    """Notifie la pharmacie d'une nouvelle commande."""
    if commande.pharmacie and commande.pharmacie.user:
        send_notification(
            user=commande.pharmacie.user,
            titre='Nouvelle commande !',
            message=f'Vous avez reçu une nouvelle commande #{commande.numero or commande.id}',
            type_notification='COMMANDE',
            lien=f'/pharmacie/commandes'
        )