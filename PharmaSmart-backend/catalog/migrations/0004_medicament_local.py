import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('catalog', '0003_search_indexes'),
        ('pharmacies', '0001_initial'),
    ]

    operations = [
        # Add the pharmacy FK that marks a medication as local (null = global).
        migrations.AddField(
            model_name='medicament',
            name='pharmacie',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='medicaments_locaux',
                to='pharmacies.pharmacyprofile',
                verbose_name='Pharmacie (médicament local)',
            ),
        ),
        # Allow local medications to be created without a catalog price.
        migrations.AlterField(
            model_name='medicament',
            name='prix',
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                max_digits=10,
                verbose_name='Prix (DH)',
            ),
        ),
    ]
