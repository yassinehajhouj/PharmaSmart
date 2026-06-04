from django.urls import path

from .views import (
    DashboardView,
    FeatureImportanceView,
    LowSellersView,
    MedicinesView,
    MetricsView,
    OverviewView,
    PredictionView,
    TrainingRunsView,
    TrainView,
)

urlpatterns = [
    path('dashboard/',          DashboardView.as_view(),        name='ml-dashboard'),
    path('train/',              TrainView.as_view(),             name='ml-train'),
    path('overview/',           OverviewView.as_view(),          name='ml-overview'),
    path('predictions/',        PredictionView.as_view(),        name='ml-predictions'),
    path('low-sellers/',        LowSellersView.as_view(),        name='ml-low-sellers'),
    path('medicines/',          MedicinesView.as_view(),         name='ml-medicines'),
    path('metrics/',            MetricsView.as_view(),           name='ml-metrics'),
    path('training-runs/',      TrainingRunsView.as_view(),      name='ml-training-runs'),
    path('feature-importance/', FeatureImportanceView.as_view(), name='ml-feature-importance'),
]
