from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import PharmacyProfile, Personnel
from .serializers import PharmacyProfileSerializer, PharmacyRegisterSerializer, PersonnelSerializer


class IsAdminUser(permissions.BasePermission):
    """Permission pour les administrateurs uniquement."""
    def has_permission(self, request, view):
        return request.user and request.user.is_staff


class PharmacyProfileViewSet(viewsets.ModelViewSet):
    """
    API endpoint pour les pharmacies.
    """
    queryset = PharmacyProfile.objects.all()
    serializer_class = PharmacyProfileSerializer

    def get_permissions(self):
        if self.action == 'list':
            return [permissions.AllowAny()]
        if self.action in ['pending', 'approve', 'reject']:
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        if self.action == 'list':
            # Seules les pharmacies approuvées sont visibles publiquement
            return PharmacyProfile.objects.filter(
                approval_status='APPROVED',
                is_active=True
            )
        return PharmacyProfile.objects.all()

    @action(detail=False, methods=['get'])
    def my_pharmacy(self, request):
        """Retourne la pharmacie de l'utilisateur connecté."""
        try:
            pharmacy = PharmacyProfile.objects.get(user=request.user)
            serializer = PharmacyProfileSerializer(pharmacy)
            return Response(serializer.data)
        except PharmacyProfile.DoesNotExist:
            return Response(
                {"error": "Vous n'avez pas de pharmacie"},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['post'])
    def register(self, request):
        """Inscription d'une nouvelle pharmacie."""
        serializer = PharmacyRegisterSerializer(data=request.data)
        if serializer.is_valid():
            pharmacy = serializer.save(user=request.user)
            request.user.user_type = 'PHARMACIEN'
            request.user.is_active = False
            request.user.save(update_fields=['user_type', 'is_active'])
            return Response(
                PharmacyProfileSerializer(pharmacy).data,
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # ===== ENDPOINTS ADMIN =====

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """Liste des pharmacies en attente d'approbation (Admin only)."""
        pharmacies = PharmacyProfile.objects.filter(approval_status='PENDING')
        serializer = PharmacyProfileSerializer(pharmacies, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def all_pharmacies(self, request):
        """Liste de toutes les pharmacies avec tous les statuts (Admin only)."""
        if not request.user.is_staff:
            return Response(
                {"error": "Accès non autorisé"},
                status=status.HTTP_403_FORBIDDEN
            )
        pharmacies = PharmacyProfile.objects.all().order_by('-created_at')
        serializer = PharmacyProfileSerializer(pharmacies, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """Approuver une pharmacie (Admin only)."""
        try:
            pharmacy = PharmacyProfile.objects.get(pk=pk)
        except PharmacyProfile.DoesNotExist:
            return Response(
                {"error": "Pharmacie non trouvée"},
                status=status.HTTP_404_NOT_FOUND
            )

        pharmacy.approval_status = 'APPROVED'
        pharmacy.approved_at = timezone.now()
        pharmacy.approved_by = request.user
        pharmacy.rejection_reason = None
        pharmacy.save()

        # Guarantee the pharmacist can log in regardless of how the account
        # was created — is_active and approval_status must stay in sync.
        pharmacy.user.is_active = True
        pharmacy.user.save(update_fields=['is_active'])

        return Response({
            "message": f"Pharmacie '{pharmacy.nom_pharmacie}' approuvée avec succès",
            "pharmacy": PharmacyProfileSerializer(pharmacy).data
        })

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Rejeter une pharmacie (Admin only)."""
        try:
            pharmacy = PharmacyProfile.objects.get(pk=pk)
        except PharmacyProfile.DoesNotExist:
            return Response(
                {"error": "Pharmacie non trouvée"},
                status=status.HTTP_404_NOT_FOUND
            )

        reason = request.data.get('reason', 'Aucune raison spécifiée')
        
        pharmacy.approval_status = 'REJECTED'
        pharmacy.rejection_reason = reason
        pharmacy.approved_at = None
        pharmacy.approved_by = None
        pharmacy.save()
        pharmacy.user.is_active = False
        pharmacy.user.save(update_fields=['is_active'])

        return Response({
            "message": f"Pharmacie '{pharmacy.nom_pharmacie}' rejetée",
            "reason": reason,
            "pharmacy": PharmacyProfileSerializer(pharmacy).data
        })

    @action(detail=True, methods=['post'])
    def suspend(self, request, pk=None):
        """Suspendre une pharmacie (Admin only)."""
        if not request.user.is_staff:
            return Response(
                {"error": "Accès non autorisé"},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            pharmacy = PharmacyProfile.objects.get(pk=pk)
        except PharmacyProfile.DoesNotExist:
            return Response(
                {"error": "Pharmacie non trouvée"},
                status=status.HTTP_404_NOT_FOUND
            )

        reason = request.data.get('reason', 'Aucune raison spécifiée')
        
        pharmacy.approval_status = 'SUSPENDED'
        pharmacy.rejection_reason = reason
        pharmacy.save()
        pharmacy.user.is_active = False
        pharmacy.user.save(update_fields=['is_active'])

        return Response({
            "message": f"Pharmacie '{pharmacy.nom_pharmacie}' suspendue",
            "reason": reason
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Statistiques des pharmacies (Admin only)."""
        if not request.user.is_staff:
            return Response(
                {"error": "Accès non autorisé"},
                status=status.HTTP_403_FORBIDDEN
            )

        stats = {
            "total": PharmacyProfile.objects.count(),
            "pending": PharmacyProfile.objects.filter(approval_status='PENDING').count(),
            "approved": PharmacyProfile.objects.filter(approval_status='APPROVED').count(),
            "rejected": PharmacyProfile.objects.filter(approval_status='REJECTED').count(),
            "suspended": PharmacyProfile.objects.filter(approval_status='SUSPENDED').count(),
        }
        return Response(stats)


class PersonnelViewSet(viewsets.ModelViewSet):
    """
    API endpoint pour le personnel.
    """
    serializer_class = PersonnelSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'pharmacy_profile'):
            return Personnel.objects.filter(pharmacie=user.pharmacy_profile)
        return Personnel.objects.none()
