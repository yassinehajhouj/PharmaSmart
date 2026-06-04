from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from pharmacies.models import PharmacyProfile

User = get_user_model()

# Only these two types can self-register. ADMIN and PERSONNEL are created
# internally (by admin panel or by a pharmacist adding staff).
_REGISTRABLE_TYPES = {
    User.UserType.PATIENT,
    User.UserType.PHARMACIEN,
}


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            'id', 'username', 'email',
            'first_name', 'last_name',
            'user_type', 'telephone', 'is_active',
        ]
        # user_type is assigned at registration and is permanent.
        # Any PUT/PATCH to /auth/profile/ that includes user_type is silently
        # ignored — the DB record is never updated.
        read_only_fields = ['user_type']


class RegisterSerializer(serializers.ModelSerializer):
    password       = serializers.CharField(write_only=True, validators=[validate_password])
    password2      = serializers.CharField(write_only=True)
    pharmacie_data = serializers.JSONField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password2',
            'first_name', 'last_name', 'user_type',
            'telephone', 'pharmacie_data',
        ]

    def validate_user_type(self, value):
        """Prevent self-registration as ADMIN or PERSONNEL."""
        if value not in _REGISTRABLE_TYPES:
            raise serializers.ValidationError(
                f"L'inscription est uniquement possible en tant que "
                f"{' ou '.join(_REGISTRABLE_TYPES)}."
            )
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError("Les mots de passe ne correspondent pas.")

        if attrs.get('user_type') == 'PHARMACIEN' and not attrs.get('pharmacie_data'):
            raise serializers.ValidationError("pharmacie_data requis pour pharmacien.")

        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        pharmacie_data = validated_data.pop('pharmacie_data', None)
        password = validated_data.pop('password')

        is_pharmacist = validated_data.get('user_type') == 'PHARMACIEN'
        user = User.objects.create_user(
            **validated_data,
            password=password,
            is_active=not is_pharmacist,
        )

        if user.user_type == 'PHARMACIEN' and pharmacie_data:
            PharmacyProfile.objects.create(
                user=user,
                nom_pharmacie=pharmacie_data.get('nom', ''),
                numero_autorisation=pharmacie_data.get('numero_licence', ''),
                adresse=pharmacie_data.get('adresse', ''),
                ville=pharmacie_data.get('ville', ''),
                telephone=pharmacie_data.get('telephone', ''),
                approval_status=PharmacyProfile.ApprovalStatus.PENDING,
                is_active=True,
            )

        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Login: username + password (required) + user_type (optional).

    When the frontend sends user_type (e.g. 'PHARMACIEN'), the backend
    verifies that the authenticated user's actual role matches.
    A patient trying to log in via the pharmacist form receives 403.
    Omitting user_type skips the check (backward-compatible).
    """
    user_type = serializers.CharField(write_only=True, required=False, allow_blank=True)

    def validate(self, attrs):
        # Extract before super() — authenticate() must not receive it.
        requested_type = attrs.pop('user_type', None) or None
        login = attrs.get(self.username_field)
        password = attrs.get('password')

        inactive_user = (
            User.objects.filter(username=login).first()
            or User.objects.filter(email__iexact=login).first()
        )
        if (
            inactive_user
            and not inactive_user.is_active
            and inactive_user.user_type == 'PHARMACIEN'
            and inactive_user.check_password(password)
        ):
            raise PermissionDenied(
                "Accès refusé : votre compte pharmacie est en attente "
                "d'approbation par l'administrateur."
            )

        # Standard simplejwt flow: verifies credentials, sets self.user.
        data = super().validate(attrs)

        # Role gate: only fires when the caller declared an expected type.
        if requested_type and self.user.user_type != requested_type:
            raise PermissionDenied(
                "Accès refusé : ce compte n'est pas enregistré comme "
                f"{requested_type.lower()}."
            )

        if self.user.user_type == 'PHARMACIEN':
            try:
                pharmacy = self.user.pharmacy_profile
            except PharmacyProfile.DoesNotExist:
                raise PermissionDenied(
                    "Accès refusé : aucun profil pharmacie n'est associé à ce compte."
                )

            if pharmacy.approval_status != PharmacyProfile.ApprovalStatus.APPROVED:
                raise PermissionDenied(
                    "Accès refusé : votre compte pharmacie est en attente "
                    "d'approbation par l'administrateur."
                )

        data['user'] = UserSerializer(self.user).data

        if self.user.user_type == 'PHARMACIEN':
            try:
                data['pharmacy_status'] = self.user.pharmacy_profile.approval_status
            except PharmacyProfile.DoesNotExist:
                data['pharmacy_status'] = None

        return data


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField()
    new_password = serializers.CharField(validators=[validate_password])
