from django.db import models
from django.conf import settings
from decimal import Decimal


class Panier(models.Model):
    """
    Panier d'achat d'un patient.
    Un patient a un seul panier actif.
    """
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='panier',
        verbose_name="Patient"
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
        verbose_name = "Panier"
        verbose_name_plural = "Paniers"

    def __str__(self):
        return f"Panier de {self.user.username}"
    
    @property
    def total(self):
        return sum(item.sous_total for item in self.items.all())
    
    @property
    def nombre_items(self):
        return self.items.count()


class ItemPanier(models.Model):
    """
    Item dans un panier.
    """
    
    panier = models.ForeignKey(
        Panier,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name="Panier"
    )
    
    stock = models.ForeignKey(
        'inventory.Stock',
        on_delete=models.CASCADE,
        verbose_name="Stock médicament"
    )
    
    quantite = models.PositiveIntegerField(
        default=1,
        verbose_name="Quantité"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date d'ajout"
    )

    class Meta:
        verbose_name = "Item Panier"
        verbose_name_plural = "Items Panier"
        unique_together = ['panier', 'stock']

    def __str__(self):
        return f"{self.quantite}x {self.stock.medicament.nom}"
    
    @property
    def sous_total(self):
        return self.stock.prix_effectif * self.quantite


class Ordonnance(models.Model):
    """
    Ordonnance uploadée par un patient.
    """
    
    class StatutOrdonnance(models.TextChoices):
        EN_ATTENTE = 'EN_ATTENTE', 'En attente de validation'
        VALIDEE = 'VALIDEE', 'Validée'
        REJETEE = 'REJETEE', 'Rejetée'
        EXPIREE = 'EXPIREE', 'Expirée'
    
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ordonnances',
        verbose_name="Patient"
    )
    
    pharmacie = models.ForeignKey(
        'pharmacies.PharmacyProfile',
        on_delete=models.CASCADE,
        blank=True,
        null=True,
        related_name='ordonnances',
        verbose_name="Pharmacie"
    )
    
    fichier = models.FileField(
        upload_to='ordonnances/',
        verbose_name="Fichier ordonnance"
    )
    
    statut = models.CharField(
        max_length=20,
        choices=StatutOrdonnance.choices,
        default=StatutOrdonnance.EN_ATTENTE,
        verbose_name="Statut"
    )
    
    medecin = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name="Médecin prescripteur"
    )
    
    date_prescription = models.DateField(
        blank=True,
        null=True,
        verbose_name="Date de prescription"
    )
    
    date_expiration = models.DateField(
        blank=True,
        null=True,
        verbose_name="Date d'expiration"
    )
    
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name="Notes"
    )
    
    validated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='ordonnances_validees',
        verbose_name="Validée par"
    )
    
    validated_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Date de validation"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date d'upload"
    )

    class Meta:
        verbose_name = "Ordonnance"
        verbose_name_plural = "Ordonnances"
        ordering = ['-created_at']

    def __str__(self):
        return f"Ordonnance de {self.patient.username} ({self.get_statut_display()})"


class Commande(models.Model):
    """
    Commande passée par un patient.
    """
    
    class StatutCommande(models.TextChoices):
        EN_ATTENTE = 'EN_ATTENTE', 'En attente'
        CONFIRMEE = 'CONFIRMEE', 'Confirmée'
        EN_PREPARATION = 'EN_PREPARATION', 'En préparation'
        PRETE = 'PRETE', 'Prête'
        EN_LIVRAISON = 'EN_LIVRAISON', 'En livraison'
        LIVREE = 'LIVREE', 'Livrée'
        ANNULEE = 'ANNULEE', 'Annulée'
    
    class ModeLivraison(models.TextChoices):
        RETRAIT = 'RETRAIT', 'Retrait en pharmacie'
        LIVRAISON = 'LIVRAISON', 'Livraison à domicile'
    
    numero = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="N° Commande"
    )
    
    patient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='commandes',
        verbose_name="Patient"
    )
    
    pharmacie = models.ForeignKey(
        'pharmacies.PharmacyProfile',
        on_delete=models.CASCADE,
        related_name='commandes',
        verbose_name="Pharmacie"
    )
    
    statut = models.CharField(
        max_length=20,
        choices=StatutCommande.choices,
        default=StatutCommande.EN_ATTENTE,
        verbose_name="Statut"
    )
    
    mode_livraison = models.CharField(
        max_length=20,
        choices=ModeLivraison.choices,
        default=ModeLivraison.RETRAIT,
        verbose_name="Mode de livraison"
    )
    
    adresse_livraison = models.TextField(
        blank=True,
        null=True,
        verbose_name="Adresse de livraison"
    )
    
    sous_total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Sous-total"
    )
    
    frais_livraison = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Frais de livraison"
    )
    
    total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00'),
        verbose_name="Total"
    )
    
    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name="Notes"
    )
    
    ordonnance = models.ForeignKey(
        Ordonnance,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='commandes',
        verbose_name="Ordonnance"
    )
    
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de commande"
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Date de modification"
    )
    
    confirmed_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Date de confirmation"
    )
    
    delivered_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Date de livraison"
    )

    class Meta:
        verbose_name = "Commande"
        verbose_name_plural = "Commandes"
        ordering = ['-created_at']

    def __str__(self):
        return f"Commande {self.numero}"
    
    def save(self, *args, **kwargs):
        if not self.numero:
            import uuid
            self.numero = f"CMD-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)


class LigneCommande(models.Model):
    """
    Ligne d'une commande (un médicament commandé).
    """
    
    commande = models.ForeignKey(
        Commande,
        on_delete=models.CASCADE,
        related_name='lignes',
        verbose_name="Commande"
    )
    
    medicament = models.ForeignKey(
        'catalog.Medicament',
        on_delete=models.CASCADE,
        verbose_name="Médicament"
    )
    
    quantite = models.PositiveIntegerField(
        default=1,
        verbose_name="Quantité"
    )
    
    prix_unitaire = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Prix unitaire"
    )
    
    sous_total = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Sous-total"
    )

    class Meta:
        verbose_name = "Ligne de commande"
        verbose_name_plural = "Lignes de commande"

    def __str__(self):
        return f"{self.quantite}x {self.medicament.nom}"
    
    def save(self, *args, **kwargs):
        self.sous_total = self.prix_unitaire * self.quantite
        super().save(*args, **kwargs)