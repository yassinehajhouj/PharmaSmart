import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Import Django ASGI app en premier
django_asgi_app = get_asgi_application()

# Imports après la configuration Django
from channels.routing import ProtocolTypeRouter, URLRouter
from notifications.middleware import JWTAuthMiddlewareStack
from notifications.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": JWTAuthMiddlewareStack(
        URLRouter(
            websocket_urlpatterns
        )
    ),
})