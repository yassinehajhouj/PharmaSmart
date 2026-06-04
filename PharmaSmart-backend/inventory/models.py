from django.db import models
from django.db.models import F
from django.core.validators import MinValueValidator, MaxValueValidator


class Fournisseur(models.Model):
    """
    Fournisseurs de médicaments.
    """
    
    nom = models.CharField(
        max_length=200,
        verbose_name="Nom du fournisseur"
    )
    
    contact = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name="Personne de contact"
    )
    
    email = models.EmailField(
        blank=True,
        null=True,
        verbose_name="Email"
    )
    
    telephone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name="Téléphone"
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
    
    is_active = models.BooleanField(
        default=True,
        verbose_name="Actif"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de création"
    )

    class Meta:
        verbose_name = "Fournisseur"
        verbose_name_plural = "Fournisseurs"
        ordering = ['nom']

    def __str__(self):
        return self.nom


class Stock(models.Model):
    """
    Stock de médicaments par pharmacie.
    Chaque pharmacie a son propre stock.
    """
    
    pharmacie = models.ForeignKey(
        'pharmacies.PharmacyProfile',
        on_delete=models.CASCADE,
        related_name='stocks',
        verbose_name="Pharmacie"
    )
    
    medicament = models.ForeignKey(
        'catalog.Medicament',
        on_delete=models.CASCADE,
        related_name='stocks',
        verbose_name="Médicament"
    )
    
    fournisseur = models.ForeignKey(
        Fournisseur,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='stocks',
        verbose_name="Fournisseur"
    )
    
    quantite = models.PositiveIntegerField(
        default=0,
        verbose_name="Quantité en stock"
    )
    
    seuil_alerte = models.PositiveIntegerField(
        default=10,
        verbose_name="Seuil d'alerte",
        help_text="Alerte si le stock descend en dessous"
    )
    
    prix_vente = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        blank=True,
        null=True,
        verbose_name="Prix de vente (DH)",
        help_text="Laissez vide pour utiliser le prix par défaut"
    )
    
    date_expiration = models.DateField(
        blank=True,
        null=True,
        verbose_name="Date d'expiration"
    )
    
    emplacement = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Emplacement",
        help_text="Ex: Rayon A, Étagère 3"
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
        verbose_name = "Stock"
        verbose_name_plural = "Stocks"
        ordering = ['-updated_at']
        # Un médicament ne peut apparaître qu'une fois par pharmacie
        unique_together = ['pharmacie', 'medicament']

    def __str__(self):
        return f"{self.medicament.nom} @ {self.pharmacie.nom_pharmacie} ({self.quantite})"
    
    @property
    def is_low_stock(self):
        """Vérifie si le stock est bas."""
        return self.quantite <= self.seuil_alerte
    
    @property
    def is_out_of_stock(self):
        """Vérifie si le stock est épuisé."""
        return self.quantite == 0
    
    @property
    def prix_effectif(self):
        return self.prix_vente if self.prix_vente is not None else self.medicament.prix

    def decremente(self, quantite: int) -> None:
        """Décrémente le stock de façon atomique (évite les race conditions)."""
        Stock.objects.filter(pk=self.pk).update(quantite=F('quantite') - quantite)
        self.refresh_from_db()

    def restaure(self, quantite: int) -> None:
        """Restaure le stock de façon atomique."""
        Stock.objects.filter(pk=self.pk).update(quantite=F('quantite') + quantite)
        self.refresh_from_db()


class Promotion(models.Model):
    """
    Promotions sur les médicaments.
    """
    
    pharmacie = models.ForeignKey(
        'pharmacies.PharmacyProfile',
        on_delete=models.CASCADE,
        related_name='promotions',
        verbose_name="Pharmacie"
    )
    
    medicament = models.ForeignKey(
        'catalog.Medicament',
        on_delete=models.CASCADE,
        related_name='promotions',
        verbose_name="Médicament"
    )
    
    pourcentage_reduction = models.PositiveIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(99)],
        verbose_name="Réduction (%)",
        help_text="Entre 1 et 99%"
    )
    
    date_debut = models.DateTimeField(
        verbose_name="Date de début"
    )
    
    date_fin = models.DateTimeField(
        verbose_name="Date de fin"
    )
    
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name="Description de la promotion"
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
        verbose_name = "Promotion"
        verbose_name_plural = "Promotions"
        ordering = ['-date_debut']

    def __str__(self):
        return f"{self.pourcentage_reduction}% sur {self.medicament.nom}"
    
    @property
    def is_valid(self):
        """Vérifie si la promotion est en cours."""
        from django.utils import timezone
        now = timezone.now()
        return self.is_active and self.date_debut <= now <= self.date_fin