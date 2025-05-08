import logging

from django.db import migrations
from django.conf import settings

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


def backfill_excluded_areas(apps, schema_editor):
    DataLayer = apps.get_model("datasets", "DataLayer")
    Dataset = apps.get_model("datasets", "Dataset")
    Scenario = apps.get_model("planning", "Scenario")

    legacy_excluded_areas_dataset = Dataset.objects.filter(
        name="Legacy Excluded Areas",
        organization__name=settings.DEFAULT_ORGANIZATION_NAME,
    ).first()

    legacy_excluded_areas = DataLayer.objects.filter(
        dataset=legacy_excluded_areas_dataset,
    ).values_list("name", "id")

    lookup_dict = {name: id for name, id in legacy_excluded_areas}

    for scenario in Scenario.objects.iterator(chunk_size=100):
        legacy_excluded_areas = scenario.configuration.get("excluded_areas", [])
        if not legacy_excluded_areas:
            logger.warning(f"Skipping scenario {scenario.id} as it has no excluded areas")
            continue
        new_excluded_areas = [
            lookup_dict.get(area) for area in legacy_excluded_areas
        ]
        scenario.configuration["excluded_areas"] = new_excluded_areas
        scenario.save()


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0034_treatmentgoal_datalayers_and_more"),
    ]

    operations = [
        migrations.RunPython(backfill_scenario_configuration), 
        migrations.RunPython(backfill_excluded_areas),
    ]
