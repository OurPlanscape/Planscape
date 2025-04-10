from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("planning", "0029_treatmentgoalusesdatalayer_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="treatmentgoal",
            name="category",
            field=models.CharField(
                choices=[
                    ("FIRE_DYNAMICS", "Fire Dynamics"),
                    ("BIODIVERSITY", "Biodiversity"),
                    ("CARBON_BIOMASS", "Carbon/Biomass"),
                ],
                help_text="Treatment Goal category.",
                max_length=32,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="treatmentgoal",
            name="created_by",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.RESTRICT,
                related_name="created_treatment_goals",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
