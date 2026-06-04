from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FournisseurViewSet, StockViewSet, PromotionViewSet, GlobalStockViewSet

router = DefaultRouter()

router.register(r'fournisseurs', FournisseurViewSet, basename='fournisseur')
router.register(r'stocks', StockViewSet, basename='stock')  # 🔥 corrigé
router.register(r'promotions', PromotionViewSet, basename='promotion')
router.register(r'global-stocks', GlobalStockViewSet, basename='global-stocks')

urlpatterns = [
    path('', include(router.urls)),
]