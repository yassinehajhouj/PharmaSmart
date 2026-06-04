from django.db import models


class TrainingRun(models.Model):
    STATUT_CHOICES = [
        ('EN_COURS', 'En cours'),
        ('TERMINE', 'Terminé'),
        ('ERREUR', 'Erreur'),
    ]
    pharmacie = models.ForeignKey(
        'pharmacies.PharmacyProfile',
        on_delete=models.CASCADE,
        null=True, blank=True,
        related_name='training_runs',
    )
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='EN_COURS')
    medicaments_entraines = models.JSONField(default=list)
    nb_echantillons = models.IntegerField(default=0)
    erreur = models.TextField(blank=True)
    duree_secondes = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Session d'entraînement"
        verbose_name_plural = "Sessions d'entraînement"

    def __str__(self):
        return f"Training #{self.pk} – {self.statut} ({self.created_at.date()})"


class ModelMetrics(models.Model):
    training_run = models.ForeignKey(
        TrainingRun,
        on_delete=models.CASCADE,
        related_name='metrics',
    )
    pharmacie = models.ForeignKey(
        'pharmacies.PharmacyProfile',
        on_delete=models.CASCADE,
        null=True, blank=True,
    )
    medicament = models.ForeignKey(
        'catalog.Medicament',
        on_delete=models.SET_NULL,
        null=True, blank=True,
    )
    modele = models.CharField(max_length=50)
    mae = models.FloatField()
    rmse = models.FloatField()
    mape = models.FloatField(null=True, blank=True)
    n_samples = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Métriques de modèle'
        verbose_name_plural = 'Métriques de modèles'

    def __str__(self):
        med = self.medicament.nom if self.medicament else 'Tous'
        return f"{self.modele} / {med} — MAE={self.mae:.2f}"


class SalesPrediction(models.Model):
    pharmacie = models.ForeignKey(
        'pharmacies.PharmacyProfile',
        on_delete=models.CASCADE,
        related_name='ml_sales_predictions',
    )
    medicament = models.ForeignKey(
        'catalog.Medicament',
        on_delete=models.CASCADE,
        related_name='ml_sales_predictions',
    )
    modele = models.CharField(max_length=50)
    date_prediction = models.DateField()
    quantite_predite = models.FloatField()
    borne_basse = models.FloatField()
    borne_haute = models.FloatField()
    horizon_jours = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('pharmacie', 'medicament', 'modele', 'date_prediction')
        ordering = ['date_prediction']
        verbose_name = 'Prédiction de ventes'
        verbose_name_plural = 'Prédictions de ventes'

    def __str__(self):
        return f"{self.medicament.nom} / {self.date_prediction} / {self.modele}: {self.quantite_predite:.1f}"


class LowSellerReport(models.Model):
    TENDANCE_CHOICES = [
        ('BAISSE', 'En baisse'),
        ('STABLE', 'Stable'),
        ('HAUSSE', 'En hausse'),
    ]
    pharmacie = models.ForeignKey(
        'pharmacies.PharmacyProfile',
        on_delete=models.CASCADE,
        related_name='ml_low_seller_reports',
    )
    medicament = models.ForeignKey(
        'catalog.Medicament',
        on_delete=models.CASCADE,
        related_name='ml_low_seller_reports',
    )
    periode_jours = models.IntegerField()
    quantite_totale = models.IntegerField()
    quantite_moyenne_journaliere = models.FloatField()
    jours_depuis_derniere_vente = models.IntegerField(null=True, blank=True)
    tendance = models.CharField(max_length=10, choices=TENDANCE_CHOICES, default='STABLE')
    score_risque = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-score_risque']
        verbose_name = 'Rapport médicament faible vente'
        verbose_name_plural = 'Rapports médicaments faibles ventes'

    def __str__(self):
        return f"{self.medicament.nom} – score {self.score_risque:.1f}"
