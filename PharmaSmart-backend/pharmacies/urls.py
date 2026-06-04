from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PharmacyProfileViewSet, PersonnelViewSet

router = DefaultRouter()
router.register(r'profiles', PharmacyProfileViewSet, basename='pharmacy')
router.register(r'personnel', PersonnelViewSet, basename='personnel')

urlpatterns = [
    path('', include(router.urls)),
    path('api/', include('inventory.urls')),
]
