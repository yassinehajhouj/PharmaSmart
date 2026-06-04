from django.db import models


class Categorie(models.Model):
    """
    Catégories de médicaments.
    Correspond aux 8 catégories du frontend.
    """
    
    nom = models.CharField(
        max_length=100,
        unique=True,
        verbose_name="Nom de la catégorie"
    )
    
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name="Description"
    )
    
    icone = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name="Icône (classe CSS ou emoji)"
    )
    
    couleur = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name="Couleur (hex)",
        help_text="Ex: #FF6B6B"
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
        verbose_name = "Catégorie"
        verbose_name_plural = "Catégories"
        ordering = ['nom']

    def __str__(self):
        return self.nom


class Medicament(models.Model):
    """
    Médicaments disponibles sur la plateforme.
    """
    
    # Pharmacie propriétaire — None = médicament global du catalogue.
    # Défini = médicament local privé de cette pharmacie uniquement.
    pharmacie = models.ForeignKey(
        'pharmacies.PharmacyProfile',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='medicaments_locaux',
        verbose_name="Pharmacie (médicament local)",
    )

    # Informations de base
    nom = models.CharField(
        max_length=200,
        verbose_name="Nom du médicament"
    )

    description = models.TextField(
        blank=True,
        null=True,
        verbose_name="Description"
    )

    categorie = models.ForeignKey(
        Categorie,
        on_delete=models.PROTECT,
        related_name='medicaments',
        verbose_name="Catégorie"
    )
    
    # Détails du médicament
    principe_actif = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name="Principe actif"
    )
    
    dosage = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Dosage",
        help_text="Ex: 500mg, 1g"
    )
    
    forme = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Forme",
        help_text="Ex: Comprimé, Sirop, Gélule"
    )
    
    # Prix — default 0 pour les médicaments locaux créés sans prix catalogue
    prix = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Prix (DH)"
    )
    
    # Image
    image = models.ImageField(
        upload_to='medicaments/',
        blank=True,
        null=True,
        verbose_name="Image"
    )
    
    # Informations médicales
    ordonnance_requise = models.BooleanField(
        default=False,
        verbose_name="Ordonnance requise"
    )
    
    posologie = models.TextField(
        blank=True,
        null=True,
        verbose_name="Posologie"
    )
    
    contre_indications = models.TextField(
        blank=True,
        null=True,
        verbose_name="Contre-indications"
    )
    
    effets_secondaires = models.TextField(
        blank=True,
        null=True,
        verbose_name="Effets secondaires"
    )
    
    # Métadonnées
    code_barre = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        unique=True,
        verbose_name="Code-barres"
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
        verbose_name = "Médicament"
        verbose_name_plural = "Médicaments"
        ordering = ['nom']
        indexes = [
            models.Index(fields=['nom'],            name='medicament_nom_idx'),
            models.Index(fields=['principe_actif'], name='medicament_pa_idx'),
        ]

    def __str__(self):
        if self.dosage:
            return f"{self.nom} {self.dosage}"
        return self.nom