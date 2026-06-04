from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Modèle utilisateur personnalisé.
    Hérite de AbstractUser pour garder les fonctionnalités de base
    (username, email, password, is_active, is_staff, etc.)
    """
    
    # Types d'utilisateurs
    class UserType(models.TextChoices):
        ADMIN = 'ADMIN', 'Administrateur'
        PATIENT = 'PATIENT', 'Patient'
        PHARMACIEN = 'PHARMACIEN', 'Pharmacien'
        PERSONNEL = 'PERSONNEL', 'Personnel Pharmacie'
    
    # Champs supplémentaires
    user_type = models.CharField(
        max_length=20,
        choices=UserType.choices,
        default=UserType.PATIENT,
        verbose_name="Type d'utilisateur"
    )
    
    telephone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name="Téléphone"
    )
    
    date_naissance = models.DateField(
        blank=True,
        null=True,
        verbose_name="Date de naissance"
    )
    
    adresse = models.TextField(
        blank=True,
        null=True,
        verbose_name="Adresse"
    )
    
    ville = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Ville"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de création"
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Date de modification"
    )

    class Meta:
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.username} ({self.get_user_type_display()})"
    
    @property
    def is_patient(self):
        return self.user_type == self.UserType.PATIENT
    
    @property
    def is_pharmacien(self):
        return self.user_type == self.UserType.PHARMACIEN
    
    @property
    def is_personnel(self):
        return self.user_type == self.UserType.PERSONNEL
