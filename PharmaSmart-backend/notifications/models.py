from django.db import models
from django.conf import settings


class Notification(models.Model):
    """
    Notifications envoyées aux utilisateurs.
    """
    
    class TypeNotification(models.TextChoices):
        INFO = 'INFO', 'Information'
        COMMANDE = 'COMMANDE', 'Commande'
        STOCK = 'STOCK', 'Alerte stock'
        ORDONNANCE = 'ORDONNANCE', 'Ordonnance'
        PROMOTION = 'PROMOTION', 'Promotion'
        SYSTEME = 'SYSTEME', 'Système'
        APPROBATION = 'APPROBATION', 'Approbation pharmacie'
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name="Destinataire"
    )
    
    type_notification = models.CharField(
        max_length=20,
        choices=TypeNotification.choices,
        default=TypeNotification.INFO,
        verbose_name="Type"
    )
    
    titre = models.CharField(
        max_length=200,
        verbose_name="Titre"
    )
    
    message = models.TextField(
        verbose_name="Message"
    )
    
    lien = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name="Lien",
        help_text="URL vers la ressource concernée"
    )
    
    is_read = models.BooleanField(
        default=False,
        verbose_name="Lu"
    )
    
    read_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Date de lecture"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de création"
    )

    class Meta:
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ['-created_at']

    def __str__(self):
        status = "✓" if self.is_read else "●"
        return f"{status} {self.titre} - {self.user.username}"
    
    def mark_as_read(self):
        if not self.is_read:
            from django.utils import timezone
            self.is_read = True
            self.read_at = timezone.now()
            self.save()