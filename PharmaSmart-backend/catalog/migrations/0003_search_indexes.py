from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('catalog', '0002_alter_categorie_id_alter_medicament_id'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='medicament',
            index=models.Index(fields=['nom'], name='medicament_nom_idx'),
        ),
        migrations.AddIndex(
            model_name='medicament',
            index=models.Index(fields=['principe_actif'], name='medicament_pa_idx'),
        ),
    ]
