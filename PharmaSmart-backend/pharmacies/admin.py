from django.contrib import admin
from django.utils import timezone
from django.utils.html import mark_safe

from .models import PharmacyProfile, Personnel


# ── Bulk actions ──────────────────────────────────────────────────────────────

@admin.action(description='✅ Approuver les pharmacies sélectionnées')
def approuver_pharmacies(modeladmin, request, queryset):
    # queryset.update() only touches PharmacyProfile rows — it never reaches
    # the linked User table. Iterate so we can sync User.is_active explicitly.
    now = timezone.now()
    count = 0
    for pharmacy in queryset.select_related('user'):
        pharmacy.approval_status = PharmacyProfile.ApprovalStatus.APPROVED
        pharmacy.approved_at = now
        pharmacy.approved_by = request.user
        pharmacy.rejection_reason = None
        pharmacy.save()
        pharmacy.user.is_active = True
        pharmacy.user.save(update_fields=['is_active'])
        count += 1
    modeladmin.message_user(request, f"{count} pharmacie(s) approuvée(s) avec succès.")


@admin.action(description='❌ Rejeter les pharmacies sélectionnées')
def rejeter_pharmacies(modeladmin, request, queryset):
    count = 0
    for pharmacy in queryset.select_related('user'):
        pharmacy.approval_status = PharmacyProfile.ApprovalStatus.REJECTED
        pharmacy.approved_at = None
        pharmacy.approved_by = None
        pharmacy.rejection_reason = 'Dossier incomplet ou non conforme.'
        pharmacy.save()
        pharmacy.user.is_active = False
        pharmacy.user.save(update_fields=['is_active'])
        count += 1
    modeladmin.message_user(request, f"{count} pharmacie(s) rejetée(s). Modifiez le motif si nécessaire.")


@admin.action(description='⏸ Suspendre les pharmacies sélectionnées')
def suspendre_pharmacies(modeladmin, request, queryset):
    count = 0
    for pharmacy in queryset.select_related('user'):
        pharmacy.approval_status = PharmacyProfile.ApprovalStatus.SUSPENDED
        pharmacy.save()
        pharmacy.user.is_active = False
        pharmacy.user.save(update_fields=['is_active'])
        count += 1
    modeladmin.message_user(request, f"{count} pharmacie(s) suspendue(s).")


# ── PharmacyProfileAdmin ──────────────────────────────────────────────────────

@admin.register(PharmacyProfile)
class PharmacyProfileAdmin(admin.ModelAdmin):

    actions = [approuver_pharmacies, rejeter_pharmacies, suspendre_pharmacies]

    # ── list view ─────────────────────────────────────────────────────────────

    list_display  = ['nom_pharmacie', 'user', 'ville', 'statut_badge', 'is_active', 'created_at']
    list_filter   = ['approval_status', 'ville', 'is_active', 'created_at']
    search_fields = ['nom_pharmacie', 'user__username', 'numero_autorisation', 'ville']
    ordering      = ['-created_at']

    # ── detail view ───────────────────────────────────────────────────────────

    # approved_by and approved_at are set by actions only — never typed manually.
    readonly_fields = ['approved_by', 'approved_at', 'created_at', 'updated_at']

    fieldsets = (
        ('Informations générales', {
            'fields': ('user', 'nom_pharmacie', 'numero_autorisation'),
        }),
        ('Coordonnées', {
            'fields': ('adresse', 'ville', 'code_postal', 'telephone', 'email_pharmacie'),
        }),
        ('Documents', {
            'fields': ('diplome', 'autorisation_exercice', 'registre_commerce'),
        }),
        ('Approbation', {
            'fields': ('approval_status', 'rejection_reason', 'approved_by', 'approved_at'),
            'description': (
                'Utilisez les actions de la liste pour approuver/rejeter. '
                'Modifiez le motif de rejet ici si nécessaire.'
            ),
        }),
        ('Autres', {
            'fields': ('horaires_ouverture', 'is_active', 'created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    # ── colored status badge ──────────────────────────────────────────────────

    _BADGE_STYLES = {
        PharmacyProfile.ApprovalStatus.PENDING:   ('background:#fff3cd;color:#856404;', 'En attente'),
        PharmacyProfile.ApprovalStatus.APPROVED:  ('background:#d4edda;color:#155724;', 'Approuvée'),
        PharmacyProfile.ApprovalStatus.REJECTED:  ('background:#f8d7da;color:#721c24;', 'Rejetée'),
        PharmacyProfile.ApprovalStatus.SUSPENDED: ('background:#e2e3e5;color:#383d41;', 'Suspendue'),
    }

    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        # Keep User.is_active in sync whenever approval_status is changed
        # directly through the detail form.
        if 'approval_status' in form.changed_data:
            obj.user.is_active = (obj.approval_status == PharmacyProfile.ApprovalStatus.APPROVED)
            obj.user.save(update_fields=['is_active'])

    @admin.display(description='Statut', ordering='approval_status')
    def statut_badge(self, obj):
        style, label = self._BADGE_STYLES.get(obj.approval_status, ('', obj.approval_status))
        return mark_safe(
            f'<span style="{style}padding:3px 12px;border-radius:12px;'
            f'font-size:12px;font-weight:600;white-space:nowrap;">{label}</span>'
        )


# ── PersonnelAdmin ────────────────────────────────────────────────────────────

@admin.register(Personnel)
class PersonnelAdmin(admin.ModelAdmin):
    list_display  = ['user', 'pharmacie', 'role', 'is_active', 'date_embauche']
    list_filter   = ['role', 'is_active', 'pharmacie']
    search_fields = ['user__username', 'pharmacie__nom_pharmacie']
    ordering      = ['-created_at']
