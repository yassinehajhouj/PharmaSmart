from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PanierViewSet, CommandeViewSet, OrdonnanceViewSet

router = DefaultRouter()
router.register(r'panier', PanierViewSet, basename='panier')
router.register(r'commandes', CommandeViewSet, basename='commande')
router.register(r'ordonnances', OrdonnanceViewSet, basename='ordonnance')

urlpatterns = [
    path('', include(router.urls)),
]