from django.db import models
from django.conf import settings


class PatientProfile(models.Model):
    """
    Profil étendu pour les patients.
    Lié au User avec une relation OneToOne.
    """
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='patient_profile',
        verbose_name="Utilisateur"
    )
    
    numero_securite_sociale = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name="N° Sécurité Sociale"
    )
    
    allergies = models.TextField(
        blank=True,
        null=True,
        verbose_name="Allergies connues"
    )
    
    antecedents_medicaux = models.TextField(
        blank=True,
        null=True,
        verbose_name="Antécédents médicaux"
    )
    
    medecin_traitant = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name="Médecin traitant"
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
        verbose_name = "Profil Patient"
        verbose_name_plural = "Profils Patients"

    def __str__(self):
        return f"Profil de {self.user.username}"