from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ConversationViewSet, ChatView, PredictionViewSet, OllamaConfigViewSet

router = DefaultRouter()
router.register(r'conversations', ConversationViewSet, basename='conversation')
router.register(r'predictions', PredictionViewSet, basename='prediction')
router.register(r'config', OllamaConfigViewSet, basename='ollama-config')

urlpatterns = [
    path('', include(router.urls)),
    path('chat/', ChatView.as_view(), name='chat'),
]