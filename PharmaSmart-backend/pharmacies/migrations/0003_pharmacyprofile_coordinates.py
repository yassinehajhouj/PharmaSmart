from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pharmacies', '0002_alter_personnel_id_alter_pharmacyprofile_id'),
    ]

    operations = [
        migrations.AddField(
            model_name='pharmacyprofile',
            name='latitude',
            field=models.DecimalField(
                blank=True, decimal_places=6, max_digits=9,
                null=True, verbose_name='Latitude',
            ),
        ),
        migrations.AddField(
            model_name='pharmacyprofile',
            name='longitude',
            field=models.DecimalField(
                blank=True, decimal_places=6, max_digits=9,
                null=True, verbose_name='Longitude',
            ),
        ),
    ]
