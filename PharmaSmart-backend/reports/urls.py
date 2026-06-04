from django.urls import path
from .views import ReportDataView, ReportExportView

urlpatterns = [
    path('data/',   ReportDataView.as_view(),   name='report-data'),
    path('export/', ReportExportView.as_view(), name='report-export'),
]
