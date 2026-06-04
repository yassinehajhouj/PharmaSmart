from django.db import migrations


def sync_pharmacist_active_status(apps, schema_editor):
    PharmacyProfile = apps.get_model('pharmacies', 'PharmacyProfile')
    User = apps.get_model('authentication', 'User')

    approved_user_ids = PharmacyProfile.objects.filter(
        approval_status='APPROVED',
    ).values_list('user_id', flat=True)
    blocked_user_ids = PharmacyProfile.objects.exclude(
        approval_status='APPROVED',
    ).values_list('user_id', flat=True)

    User.objects.filter(id__in=approved_user_ids).update(is_active=True)
    User.objects.filter(id__in=blocked_user_ids).update(is_active=False)


def reverse_sync_pharmacist_active_status(apps, schema_editor):
    PharmacyProfile = apps.get_model('pharmacies', 'PharmacyProfile')
    User = apps.get_model('authentication', 'User')

    user_ids = PharmacyProfile.objects.values_list('user_id', flat=True)
    User.objects.filter(id__in=user_ids).update(is_active=True)


class Migration(migrations.Migration):

    dependencies = [
        ('pharmacies', '0004_alter_personnel_id_alter_pharmacyprofile_id'),
    ]

    operations = [
        migrations.RunPython(
            sync_pharmacist_active_status,
            reverse_sync_pharmacist_active_status,
        ),
    ]
