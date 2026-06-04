from django.db import models
from django.conf import settings


class PharmacyProfile(models.Model):
    """
    Profil d'une pharmacie.
    Doit être approuvé par un admin avant de pouvoir opérer.
    """
    
    # Statuts d'approbation
    class ApprovalStatus(models.TextChoices):
        PENDING = 'PENDING', 'En attente'
        APPROVED = 'APPROVED', 'Approuvée'
        REJECTED = 'REJECTED', 'Rejetée'
        SUSPENDED = 'SUSPENDED', 'Suspendue'
    
    # Relation avec le User (le pharmacien propriétaire)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='pharmacy_profile',
        verbose_name="Pharmacien propriétaire"
    )
    
    # Informations de la pharmacie
    nom_pharmacie = models.CharField(
        max_length=200,
        verbose_name="Nom de la pharmacie"
    )
    
    numero_autorisation = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="N° Autorisation d'exercice"
    )
    
    adresse = models.TextField(
        verbose_name="Adresse complète"
    )
    
    ville = models.CharField(
        max_length=100,
        verbose_name="Ville"
    )
    
    code_postal = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name="Code postal"
    )
    
    telephone = models.CharField(
        max_length=20,
        verbose_name="Téléphone pharmacie"
    )
    
    email_pharmacie = models.EmailField(
        blank=True,
        null=True,
        verbose_name="Email pharmacie"
    )
    
    # Documents requis pour l'approbation
    diplome = models.FileField(
        upload_to='pharmacies/diplomes/',
        blank=True,
        null=True,
        verbose_name="Diplôme de pharmacien"
    )
    
    autorisation_exercice = models.FileField(
        upload_to='pharmacies/autorisations/',
        blank=True,
        null=True,
        verbose_name="Autorisation d'exercice"
    )
    
    registre_commerce = models.FileField(
        upload_to='pharmacies/registres/',
        blank=True,
        null=True,
        verbose_name="Registre de commerce"
    )
    
    # Statut d'approbation
    approval_status = models.CharField(
        max_length=20,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING,
        verbose_name="Statut d'approbation"
    )
    
    rejection_reason = models.TextField(
        blank=True,
        null=True,
        verbose_name="Motif de rejet"
    )
    
    approved_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Date d'approbation"
    )
    
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='approved_pharmacies',
        verbose_name="Approuvé par"
    )
    
    # Coordonnées GPS
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        verbose_name="Latitude",
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        verbose_name="Longitude",
    )

    # Horaires d'ouverture
    horaires_ouverture = models.TextField(
        blank=True,
        null=True,
        verbose_name="Horaires d'ouverture"
    )
    
    # Métadonnées
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
        verbose_name="Date de modification"
    )

    class Meta:
        verbose_name = "Profil Pharmacie"
        verbose_name_plural = "Profils Pharmacies"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.nom_pharmacie} ({self.get_approval_status_display()})"
    
    @property
    def is_approved(self):
        """Vérifie si la pharmacie est approuvée."""
        return self.approval_status == self.ApprovalStatus.APPROVED


class Personnel(models.Model):
    """
    Personnel travaillant dans une pharmacie.
    Créé par le pharmacien propriétaire.
    """
    
    class Role(models.TextChoices):
        ASSISTANT = 'ASSISTANT', 'Assistant pharmacien'
        VENDEUR = 'VENDEUR', 'Vendeur'
        GESTIONNAIRE = 'GESTIONNAIRE', 'Gestionnaire de stock'
        LIVREUR = 'LIVREUR', 'Livreur'
    
    # Relation avec le User
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='personnel_profile',
        verbose_name="Compte utilisateur"
    )
    
    # Relation avec la pharmacie
    pharmacie = models.ForeignKey(
        PharmacyProfile,
        on_delete=models.CASCADE,
        related_name='personnels',
        verbose_name="Pharmacie"
    )
    
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.VENDEUR,
        verbose_name="Rôle"
    )
    
    date_embauche = models.DateField(
        blank=True,
        null=True,
        verbose_name="Date d'embauche"
    )
    
    is_active = models.BooleanField(
        default=True,
        verbose_name="Actif"
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
        verbose_name = "Personnel"
        verbose_name_plural = "Personnels"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.get_role_display()} @ {self.pharmacie.nom_pharmacie}"