from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import PatientProfile
from .serializers import PatientProfileSerializer


class PatientProfileViewSet(viewsets.ModelViewSet):
    """API endpoint pour les profils patients."""
    
    serializer_class = PatientProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return PatientProfile.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['get', 'put', 'patch'])
    def mon_profil(self, request):
        """Retourne ou modifie le profil du patient connecté."""
        profile, created = PatientProfile.objects.get_or_create(user=request.user)
        
        if request.method == 'GET':
            serializer = PatientProfileSerializer(profile)
            return Response(serializer.data)
        
        serializer = PatientProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)