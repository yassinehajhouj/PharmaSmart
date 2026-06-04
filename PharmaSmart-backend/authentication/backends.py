from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

User = get_user_model()


class EmailOrUsernameBackend(ModelBackend):
    """
    Allows users to authenticate with either their username or their email.
    Falls back to ModelBackend behaviour for all other checks (is_active, etc.).
    """

    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None or password is None:
            return None

        # 1. Try exact username match
        user = User.objects.filter(username=username).first()

        # 2. Fall back to case-insensitive email match
        if user is None:
            user = User.objects.filter(email__iexact=username).first()

        if user is None:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user

        return None
