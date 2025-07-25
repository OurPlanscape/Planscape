import django.core.serializers.json
import django.db.models.deletion
from django.db import migrations, models


def copy_treatment_goals_from_configuration(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0027_alter_projectarea_data"),
    ]

    operations = [
        migrations.CreateModel(
            name="TreatmentGoal",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, null=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "deleted_at",
                    models.DateTimeField(
                        help_text="Define if the entity has been deleted or not and when",
                        null=True,
                        verbose_name="Deleted at",
                    ),
                ),
                (
                    "name",
                    models.CharField(
                        help_text="Name of the Treatment Goal.", max_length=120
                    ),
                ),
                (
                    "description",
                    models.TextField(
                        help_text="Treatment Goal description.",
                        null=True,
                    ),
                ),
                (
                    "priorities",
                    models.JSONField(
                        encoder=django.core.serializers.json.DjangoJSONEncoder,
                        help_text="Treatment Goal priorities.",
                        null=True,
                    ),
                ),
                (
                    "stand_thresholds",
                    models.JSONField(
                        encoder=django.core.serializers.json.DjangoJSONEncoder,
                        help_text="Treatment Goal stand thresholds.",
                        null=True,
                    ),
                ),
                (
                    "active",
                    models.BooleanField(
                        help_text="Treatment Goal active status.",
                        default=True,
                    ),
                ),
            ],
            options={
                "abstract": False,
            },
        ),
        migrations.AddField(
            model_name="scenario",
            name="treatment_goal",
            field=models.ForeignKey(
                help_text="Treatment Goal of the Scenario.",
                null=True,
                on_delete=django.db.models.deletion.RESTRICT,
                related_name="treatment_goals",
                to="planning.treatmentgoal",
            ),
        ),
        migrations.RunPython(copy_treatment_goals_from_configuration),
    ]
