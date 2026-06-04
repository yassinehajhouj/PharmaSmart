"""
REST API views for the ML module.
All endpoints are scoped to the authenticated pharmacist's pharmacy.
"""
from __future__ import annotations

import logging
from datetime import timedelta
from pathlib import Path

from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import LowSellerReport, ModelMetrics, SalesPrediction, TrainingRun
from .serializers import (
    LowSellerReportSerializer,
    ModelMetricsSerializer,
    TrainingRunSerializer,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_pharmacie(request):
    """
    Resolve the pharmacy for the current user.
    Supports both the pharmacy owner (pharmacy_profile) and
    staff members (personnel_profile → pharmacie).
    """
    user = request.user

    # Case 1: pharmacy owner
    try:
        return user.pharmacy_profile, None
    except Exception:
        pass

    # Case 2: pharmacy staff (Personnel)
    try:
        return user.personnel_profile.pharmacie, None
    except Exception:
        pass

    logger.warning(f"User '{user.username}' has no pharmacy profile.")
    return None, Response(
        {'error': 'Profil pharmacie introuvable. Connectez-vous en tant que pharmacien.'},
        status=status.HTTP_403_FORBIDDEN,
    )


def _models_dir() -> Path:
    path = Path(
        getattr(settings, 'ML_MODELS_DIR', Path(__file__).resolve().parent / 'saved_models')
    )
    path.mkdir(parents=True, exist_ok=True)
    return path


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------

class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pharmacie, err = _get_pharmacie(request)
        if err:
            return err

        try:
            last_run = TrainingRun.objects.filter(pharmacie=pharmacie).first()

            models_dir = _models_dir()
            nb_modeles = len(list(models_dir.glob(f'*_ph{pharmacie.id}_*.joblib')))

            from .ml.preprocessor import load_sales_dataframe
            from .ml.analyzer import compute_overall_stats
            df    = load_sales_dataframe(pharmacie_id=pharmacie.id, days_back=90)
            stats = compute_overall_stats(df, pharmacie.id)

            recent_metrics = ModelMetrics.objects.filter(pharmacie=pharmacie).order_by('-created_at')[:10]

            return Response({
                'last_training':  TrainingRunSerializer(last_run).data if last_run else None,
                'nb_modeles':     nb_modeles,
                'stats_90j':      stats,
                'recent_metrics': ModelMetricsSerializer(recent_metrics, many=True).data,
            })

        except Exception as exc:
            logger.exception(f"DashboardView error for pharmacy {pharmacie.id}: {exc}")
            return Response(
                {'error': f'Erreur lors du chargement du tableau de bord: {exc}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ---------------------------------------------------------------------------
# Training
# ---------------------------------------------------------------------------

class TrainView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        pharmacie, err = _get_pharmacie(request)
        if err:
            return err

        run = TrainingRun.objects.create(pharmacie=pharmacie, statut='EN_COURS')

        try:
            from .ml.pipeline import run_training_pipeline
            results = run_training_pipeline(pharmacie_id=pharmacie.id)

            # Persist metrics
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
                            pharmacie=pharmacie,
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

            logger.info(
                f"Training completed for pharmacy {pharmacie.id}: "
                f"{len(results['trained'])} medicines trained, "
                f"{len(results['errors'])} errors."
            )

            return Response({
                'statut':                'TERMINE',
                'medicaments_entraines': len(results['trained']),
                'erreurs':               len(results['errors']),
                'duree_secondes':        results.get('duration', 0),
            })

        except Exception as exc:
            logger.exception(f"Training error for pharmacy {pharmacie.id}: {exc}")
            run.statut = 'ERREUR'
            run.erreur = str(exc)[:1000]
            run.save()
            return Response({'error': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------------------------------------------------------------------
# Predictions
# ---------------------------------------------------------------------------

class PredictionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pharmacie, err = _get_pharmacie(request)
        if err:
            return err

        raw_id  = request.query_params.get('medicament_id')
        horizon = int(request.query_params.get('horizon', 30))

        if not raw_id:
            return Response({'error': 'medicament_id requis'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            medicament_id = int(raw_id)
        except ValueError:
            return Response({'error': 'medicament_id doit être un entier'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from .ml.pipeline import run_prediction_pipeline
            data = run_prediction_pipeline(
                pharmacie_id=pharmacie.id,
                medicament_id=medicament_id,
                horizon=horizon,
            )
            return Response(data)

        except Exception as exc:
            logger.exception(
                f"PredictionView error pharmacy={pharmacie.id} med={medicament_id}: {exc}"
            )
            return Response(
                {'error': f'Erreur de prédiction: {exc}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ---------------------------------------------------------------------------
# Low sellers
# ---------------------------------------------------------------------------

class LowSellersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pharmacie, err = _get_pharmacie(request)
        if err:
            return err

        period = int(request.query_params.get('period', 90))
        limit  = int(request.query_params.get('limit', 20))

        try:
            from .ml.preprocessor import load_sales_dataframe
            from .ml.analyzer import detect_low_sellers
            df          = load_sales_dataframe(pharmacie_id=pharmacie.id, days_back=period)
            low_sellers = detect_low_sellers(df, pharmacie.id, period_days=period, top_n=limit)

            # Persist snapshot
            LowSellerReport.objects.filter(pharmacie=pharmacie, periode_jours=period).delete()
            from catalog.models import Medicament
            for item in low_sellers:
                try:
                    med = Medicament.objects.get(pk=item['medicament_id'])
                    LowSellerReport.objects.create(
                        pharmacie=pharmacie,
                        medicament=med,
                        periode_jours=period,
                        quantite_totale=item['quantite_totale'],
                        quantite_moyenne_journaliere=item['quantite_moy_jour'],
                        jours_depuis_derniere_vente=item.get('jours_depuis_derniere_vente'),
                        tendance=item['tendance'],
                        score_risque=item['score_risque'],
                    )
                except (Medicament.DoesNotExist, Exception):
                    pass

            return Response(low_sellers)

        except Exception as exc:
            logger.exception(f"LowSellersView error pharmacy={pharmacie.id}: {exc}")
            return Response(
                {'error': f'Erreur analyse faibles ventes: {exc}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ---------------------------------------------------------------------------
# Medicines with model availability
# ---------------------------------------------------------------------------

class MedicinesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pharmacie, err = _get_pharmacie(request)
        if err:
            return err

        try:
            from inventory.models import Stock
            from .ml.trainer import model_exists

            stocks = (
                Stock.objects
                .filter(pharmacie=pharmacie)
                .select_related('medicament', 'medicament__categorie')
                .order_by('medicament__nom')
            )

            medicines = [
                {
                    'id':           s.medicament.id,
                    'nom':          s.medicament.nom,
                    'categorie':    s.medicament.categorie.nom if s.medicament.categorie else '',
                    'has_model':    model_exists(pharmacie.id, s.medicament.id, 'xgboost'),
                    'stock_actuel': s.quantite,
                }
                for s in stocks
            ]
            return Response(medicines)

        except Exception as exc:
            logger.exception(f"MedicinesView error pharmacy={pharmacie.id}: {exc}")
            return Response(
                {'error': f'Erreur chargement médicaments: {exc}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ---------------------------------------------------------------------------
# Model metrics
# ---------------------------------------------------------------------------

class MetricsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pharmacie, err = _get_pharmacie(request)
        if err:
            return err

        try:
            metrics = ModelMetrics.objects.filter(pharmacie=pharmacie).order_by('-created_at')[:50]
            return Response(ModelMetricsSerializer(metrics, many=True).data)
        except Exception as exc:
            logger.exception(f"MetricsView error pharmacy={pharmacie.id}: {exc}")
            return Response({'error': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------------------------------------------------------------------
# Training history
# ---------------------------------------------------------------------------

class TrainingRunsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pharmacie, err = _get_pharmacie(request)
        if err:
            return err

        try:
            runs = TrainingRun.objects.filter(pharmacie=pharmacie)[:10]
            return Response(TrainingRunSerializer(runs, many=True).data)
        except Exception as exc:
            logger.exception(f"TrainingRunsView error pharmacy={pharmacie.id}: {exc}")
            return Response({'error': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------------------------------------------------------------------
# Overview  (auto-ranks ALL stocked medicines by future profitability)
# ---------------------------------------------------------------------------

class OverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pharmacie, err = _get_pharmacie(request)
        if err:
            return err

        horizon = int(request.query_params.get('horizon', 30))
        top_n   = int(request.query_params.get('top_n', 10))

        try:
            from .ml.pipeline import run_training_pipeline, run_overview_pipeline

            # Auto-train if no models exist yet for this pharmacy
            existing = list(_models_dir().glob(f'*_ph{pharmacie.id}_*.joblib'))
            if not existing:
                logger.info(
                    f"No models found for pharmacy {pharmacie.id} — starting auto-training."
                )
                try:
                    results = run_training_pipeline(pharmacie_id=pharmacie.id)
                    logger.info(
                        f"Auto-training completed: {len(results['trained'])} medicines trained, "
                        f"{len(results['errors'])} errors."
                    )
                    # Persist the training run record
                    run = TrainingRun.objects.create(
                        pharmacie=pharmacie,
                        statut='TERMINE',
                        medicaments_entraines=results['trained'],
                        nb_echantillons=sum(m.get('n_samples', 0) for m in results.get('metrics', [])),
                        duree_secondes=results.get('duration', 0),
                        completed_at=timezone.now(),
                    )
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
                                    pharmacie=pharmacie,
                                    medicament=med,
                                    modele=model_type,
                                    mae=m[model_type]['mae'],
                                    rmse=m[model_type]['rmse'],
                                    mape=m[model_type].get('mape'),
                                    n_samples=m['n_samples'],
                                )
                except Exception as train_exc:
                    logger.warning(
                        f"Auto-training failed for pharmacy {pharmacie.id}: {train_exc}"
                    )

            data = run_overview_pipeline(
                pharmacie_id=pharmacie.id,
                horizon=horizon,
                top_n=top_n,
            )
            return Response(data)

        except Exception as exc:
            logger.exception(f"OverviewView error pharmacy={pharmacie.id}: {exc}")
            return Response(
                {'error': f'Erreur lors du calcul des prévisions: {exc}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ---------------------------------------------------------------------------
# Feature importance
# ---------------------------------------------------------------------------

class FeatureImportanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pharmacie, err = _get_pharmacie(request)
        if err:
            return err

        raw_id     = request.query_params.get('medicament_id')
        model_type = request.query_params.get('model', 'xgboost')

        if not raw_id:
            return Response({'error': 'medicament_id requis'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from .ml.predictor import get_feature_importances
            importances = get_feature_importances(pharmacie.id, int(raw_id), model_type)

            if not importances:
                return Response(
                    {'error': 'Modèle non trouvé. Entraînez d\'abord les modèles.'},
                    status=status.HTTP_404_NOT_FOUND,
                )
            return Response(importances)

        except Exception as exc:
            logger.exception(
                f"FeatureImportanceView error pharmacy={pharmacie.id} med={raw_id}: {exc}"
            )
            return Response({'error': str(exc)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
