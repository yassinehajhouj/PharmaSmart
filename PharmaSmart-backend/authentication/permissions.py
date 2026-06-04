from rest_framework.permissions import BasePermission


class IsPatient(BasePermission):
    """
    Grants access only to authenticated users whose role is PATIENT.
    Pharmacists, personnel, and admins are blocked.
    """
    message = "Accès réservé aux patients."

    def has_permission(self, request, view):
        return (
            request.user is not None and
            request.user.is_authenticated and
            request.user.user_type == 'PATIENT'
        )


class IsPharmacien(BasePermission):
    """
    Grants access to PHARMACIEN and PERSONNEL users whose pharmacy is APPROVED.
    Pending, rejected, or suspended pharmacies are blocked even with valid tokens.
    """
    message = "Accès réservé aux pharmaciens et au personnel de pharmacie approuvée."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        user = request.user

        if user.user_type == 'PHARMACIEN':
            profile = getattr(user, 'pharmacy_profile', None)
            return profile is not None and profile.approval_status == 'APPROVED'

        if user.user_type == 'PERSONNEL':
            personnel = getattr(user, 'personnel_profile', None)
            return (
                personnel is not None and
                personnel.pharmacie.approval_status == 'APPROVED'
            )

        return False
