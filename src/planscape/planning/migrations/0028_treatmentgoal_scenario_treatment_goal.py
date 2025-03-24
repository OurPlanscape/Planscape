import django.core.serializers.json
from django.db import migrations, models
import django.db.models.deletion


def copy_treatment_goals_from_configuration(apps, schema_editor):
    Scenario = apps.get_model("planning", "Scenario")
    TreatmentGoal = apps.get_model("planning", "TreatmentGoal")
    for scenario in Scenario.objects.all(treatment_goal__isnull=True):
        if scenario.configuration:
            configuration = scenario.configuration
            treatment_goal = TreatmentGoal.objects.get_or_create(
                name=configuration.get("treatment_goal", {}).get("name"),
                priorities=configuration.get("treatment_goal", {}).get("priorities"),
                stand_thresholds=configuration.get("treatment_goal", {}).get(
                    "stand_thresholds"
                ),
            )
            scenario.treatment_goal = treatment_goal
            scenario.save()


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
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="treatment_goals",
                to="planning.treatmentgoal",
            ),
        ),
        migrations.RunPython(copy_treatment_goals_from_configuration),
    ]
