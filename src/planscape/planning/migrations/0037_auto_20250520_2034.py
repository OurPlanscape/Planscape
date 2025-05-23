# Generated by Django 4.2.19 on 2025-05-20 20:34

from django.conf import settings
from django.db import migrations


def backfill_scenario_configuration_keys(apps, schema_editor):
    # Scenarios will contain the keys "est_cost" and "estimated_cost" at the same time
    # and the keys "max_treatment_area_ratio" and "max_area" at the same time.
    # This way, it will be compatible with the old and new configuration.
    Scenario = apps.get_model("planning", "Scenario")
    
    for scenario in Scenario.objects.iterator(chunk_size=100):
        configuration = scenario.configuration
        if "est_cost" not in configuration:
            estimated_cost = configuration.get("estimated_cost", None)
            configuration["est_cost"] = estimated_cost
        if "max_treatment_area_ratio" not in configuration:
            max_area = configuration.get("max_area", None)
            configuration["max_treatment_area_ratio"] = max_area
        scenario.configuration = configuration
        scenario.save(update_fields=["configuration"])


def backfill_scenario_excluded_areas(apps, schema_editor):
    Scenario = apps.get_model("planning", "Scenario")
    Dataset = apps.get_model("datasets", "Dataset")
    DataLayer = apps.get_model("datasets", "DataLayer")

    scenarios = Scenario.objects.exclude(
        configuration__excluded_areas=[],
    )

    legacy_excluded_areas_dataset = Dataset.objects.filter(
        name="Legacy Excluded Areas",
        organization__name=settings.DEFAULT_ORGANIZATION_NAME,
    ).first()

    legacy_excluded_areas = DataLayer.objects.filter(
        dataset=legacy_excluded_areas_dataset,
    ).values_list("id", "name")

    lookup_dict = {id: name for id, name in legacy_excluded_areas}

    for scenario in scenarios.iterator(chunk_size=100):
        configuration = scenario.configuration
        excluded_areas = configuration.get("excluded_areas", [])
        legacy_areas = [
            lookup_dict.get(area) for area in excluded_areas
        ]
        configuration["excluded_areas_ids"] = excluded_areas
        configuration["excluded_areas"] = legacy_areas
        scenario.configuration = configuration
        scenario.save(update_fields=["configuration"])


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0036_auto_20250520_1535"),
    ]

    operations = [
        migrations.RunPython(backfill_scenario_configuration_keys),
        migrations.RunPython(backfill_scenario_excluded_areas)
    ]
