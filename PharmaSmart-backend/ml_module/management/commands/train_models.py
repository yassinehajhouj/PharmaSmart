"""
Management command: python manage.py train_models [--pharmacie-id N]

Trains XGBoost and Random Forest models for medicine demand forecasting.
Persists results to TrainingRun and ModelMetrics tables.
"""
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from ml_module.ml.pipeline import run_training_pipeline
from ml_module.models import ModelMetrics, TrainingRun


class Command(BaseCommand):
    help = 'Train XGBoost and Random Forest demand-forecasting models'

    def add_arguments(self, parser):
        parser.add_argument(
            '--pharmacie-id',
            type=int,
            default=None,
            metavar='ID',
            help='Train only for this pharmacy ID (default: all approved pharmacies)',
        )

    def handle(self, *args, **options):
        pharmacie_id = options['pharmacie_id']

        self.stdout.write(self.style.NOTICE(
            f'\n  ML Training — pharmacie_id={pharmacie_id or "all"}\n'
        ))

        run = TrainingRun.objects.create(
            pharmacie_id=pharmacie_id,
            statut='EN_COURS',
        )

        try:
            results = run_training_pipeline(pharmacie_id=pharmacie_id)

            # Persist per-model metrics
            from catalog.models import Medicament
            for m in results.get('metrics', []):
                try:
                    med = Medicament.objects.get(pk=m['medicament_id'])
                except Medicament.DoesNotExist:
                    med = None

                for model_type in ['xgboost', 'random_forest']:
                    if model_type in m:
                        ModelMetrics.objects.create(
                            training_run=run,
                            pharmacie_id=m['pharmacie_id'],
                            medicament=med,
                            modele=model_type,
                            mae=m[model_type]['mae'],
                            rmse=m[model_type]['rmse'],
                            mape=m[model_type].get('mape'),
                            n_samples=m['n_samples'],
                        )

            run.statut             = 'TERMINE'
            run.medicaments_entraines = results['trained']
            run.nb_echantillons    = sum(m.get('n_samples', 0) for m in results.get('metrics', []))
            run.duree_secondes     = results.get('duration', 0)
            run.completed_at       = timezone.now()
            run.save()

            self.stdout.write(self.style.SUCCESS(
                f'\n  [OK] Training complete\n'
                f'    Trained  : {len(results["trained"])} medicine(s)\n'
                f'    Skipped  : {len(results["skipped"])}\n'
                f'    Errors   : {len(results["errors"])}\n'
                f'    Duration : {results.get("duration", 0):.1f}s\n'
            ))

        except Exception as exc:
            run.statut = 'ERREUR'
            run.erreur = str(exc)[:1000]
            run.save()
            raise CommandError(f'Training failed: {exc}') from exc
