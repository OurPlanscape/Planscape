import logging

from django.db import migrations

logger = logging.getLogger(__name__)


def backfill_scenario_configuration(apps, schema_editor):
    Scenario = apps.get_model("planning", "Scenario")
    TreatmentGoal = apps.get_model("planning", "TreatmentGoal")

    scenarios_to_backfill = (
        Scenario.objects.filter(
            treatment_goal__isnull=True,
        )
        .prefetch_related("treatment_goal")
    )

    for scenario in scenarios_to_backfill.iterator(chunk_size=100):
        configuration = scenario.configuration
        question_id = configuration.get("question_id")
        if not question_id:
            logger.warning(f"Skipping scenario {scenario.id} as it has no question ID")
            continue
        try:
            treatment_goal = TreatmentGoal.dead_or_alive.get(id=question_id)
        except TreatmentGoal.DoesNotExist:
            logger.warning(f"Treatment goal with ID {question_id} does not exist")
            continue
        scenario.treatment_goal = treatment_goal
        scenario.save()


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0034_treatmentgoal_datalayers_and_more"),
    ]

    operations = [migrations.RunPython(backfill_scenario_configuration)]
