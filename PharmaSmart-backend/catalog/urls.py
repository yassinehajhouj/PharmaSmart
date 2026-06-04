from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CategorieViewSet, MedicamentViewSet

router = DefaultRouter()
router.register(r'categories', CategorieViewSet, basename='categorie')
router.register(r'medicaments', MedicamentViewSet, basename='medicament')

urlpatterns = [
    path('', include(router.urls)),
]
