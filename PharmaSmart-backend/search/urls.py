from django.urls import path
from .views import MedicamentSearchView, BestPharmacyView

urlpatterns = [
    path('', MedicamentSearchView.as_view(), name='medicament-search'),
    path('recommend/', BestPharmacyView.as_view(), name='best-pharmacy'),
]
