import json
import django.core.serializers.json
from django.db import migrations, models
import django.db.models.deletion


def copy_treatment_goals_from_configuration(apps, schema_editor):
    with open(
        "config/treatment_goals.json", "r"
    ) as treatment_goals_file:
        regions = json.loads(treatment_goals_file.read())
        regions = regions.get("regions")
        treatment_goals = {}
        for region in regions:
            tg = region.get("treatment_goals")
            for goal in tg:
                questions = goal.get("questions")
                for question in questions:
                    treatment_goals = {
                        **treatment_goals,
                        question.get("id"): {
                            "short_question_text": question.get("short_question_text"),
                            "scenario_priorities": question.get("scenario_priorities"),
                            "stand_thresholds": question.get("stand_thresholds"),
                            "long_question_text": question.get("long_question_text"),
                            "description": question.get("description"),
                        }
                    }
            

    Scenario = apps.get_model("planning", "Scenario")
    TreatmentGoal = apps.get_model("planning", "TreatmentGoal")
    for scenario in Scenario.objects.filter(treatment_goal__isnull=True):
        if scenario.configuration:
            configuration = scenario.configuration
            question_id = configuration.get("question_id")
            tg_question = treatment_goals.get(question_id)

            name = tg_question.get("short_question_text")
            long_question_text = tg_question.get("long_question_text")
            description = f"{long_question_text}"
            descriptions = tg_question.get("description")
            for text in descriptions:
                description += f"\n{text}"

            priorities = tg_question.get("scenario_priorities")
            stand_thresholds = tg_question.get("stand_thresholds")

            treatment_goal = TreatmentGoal.objects.get_or_create(
                id=question_id,
                name=name,
                description=description,
                priorities=priorities,
                stand_thresholds=stand_thresholds,
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
