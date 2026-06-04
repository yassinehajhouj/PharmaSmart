from django.db import models
from django.conf import settings


class Conversation(models.Model):
    """
    Conversation entre un utilisateur et le chatbot.
    """
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversations',
        verbose_name="Utilisateur"
    )
    
    titre = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name="Titre de la conversation"
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name="Active"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de création"
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Dernière activité"
    )

    class Meta:
        verbose_name = "Conversation"
        verbose_name_plural = "Conversations"
        ordering = ['-updated_at']

    def __str__(self):
        return f"Conversation de {self.user.username} - {self.created_at.strftime('%d/%m/%Y')}"


class Message(models.Model):
    """
    Message dans une conversation (user ou assistant).
    """
    
    class Role(models.TextChoices):
        USER = 'USER', 'Utilisateur'
        ASSISTANT = 'ASSISTANT', 'Assistant IA'
        SYSTEM = 'SYSTEM', 'Système'
    
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages',
        verbose_name="Conversation"
    )
    
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        verbose_name="Rôle"
    )
    
    contenu = models.TextField(
        verbose_name="Contenu du message"
    )
    
    tokens_used = models.PositiveIntegerField(
        default=0,
        verbose_name="Tokens utilisés"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date d'envoi"
    )

    class Meta:
        verbose_name = "Message"
        verbose_name_plural = "Messages"
        ordering = ['created_at']

    def __str__(self):
        return f"{self.get_role_display()}: {self.contenu[:50]}..."


class Prediction(models.Model):
    """
    Prédictions de demande générées par l'IA.
    """
    
    class TypePrediction(models.TextChoices):
        DEMANDE = 'DEMANDE', 'Prédiction de demande'
        RUPTURE = 'RUPTURE', 'Risque de rupture'
        TENDANCE = 'TENDANCE', 'Tendance de vente'
    
    pharmacie = models.ForeignKey(
        'pharmacies.PharmacyProfile',
        on_delete=models.CASCADE,
        related_name='predictions',
        verbose_name="Pharmacie"
    )
    
    medicament = models.ForeignKey(
        'catalog.Medicament',
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        related_name='predictions',
        verbose_name="Médicament"
    )
    
    type_prediction = models.CharField(
        max_length=20,
        choices=TypePrediction.choices,
        verbose_name="Type de prédiction"
    )
    
    valeur_predite = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Valeur prédite"
    )
    
    unite = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name="Unité",
        help_text="Ex: unités, DH, %"
    )
    
    confiance = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        verbose_name="Niveau de confiance (%)"
    )
    
    periode_debut = models.DateField(
        verbose_name="Début de période"
    )
    
    periode_fin = models.DateField(
        verbose_name="Fin de période"
    )
    
    donnees_input = models.JSONField(
        blank=True,
        null=True,
        verbose_name="Données d'entrée",
        help_text="Données utilisées pour la prédiction"
    )
    
    modele_utilise = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Modèle IA utilisé"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de création"
    )

    class Meta:
        verbose_name = "Prédiction"
        verbose_name_plural = "Prédictions"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_type_prediction_display()} - {self.pharmacie.nom_pharmacie}"


class OllamaConfig(models.Model):
    """
    Configuration du modèle Ollama pour le chatbot.
    """
    
    nom = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Nom de la configuration"
    )
    
    modele = models.CharField(
        max_length=100,
        default='llama3.2',
        verbose_name="Modèle Ollama",
        help_text="Ex: llama3.2, mistral, gemma2"
    )
    
    url_ollama = models.URLField(
        default='http://localhost:11434',
        verbose_name="URL Ollama API"
    )
    
    system_prompt = models.TextField(
        blank=True,
        null=True,
        verbose_name="Prompt système",
        help_text="Instructions pour le comportement du chatbot"
    )
    
    temperature = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=0.7,
        verbose_name="Température",
        help_text="0.0 = déterministe, 1.0 = créatif"
    )
    
    max_tokens = models.PositiveIntegerField(
        default=2048,
        verbose_name="Max tokens"
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name="Active"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de création"
    )

    class Meta:
        verbose_name = "Configuration Ollama"
        verbose_name_plural = "Configurations Ollama"

    def __str__(self):
        return f"{self.nom} ({self.modele})"