import logging
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand

from planning.models import Scenario
from datasets.models import DataLayer, Dataset

log = logging.getLogger(__name__)


class Command(BaseCommand):
    def handle(self, *args: Any, **options: Any) -> str | None:
        self._backfill_scenario_configuration_keys()
        self._backfill_scenario_excluded_areas()

    def _backfill_scenario_configuration_keys(self):
        """
        Backfills the scenario configuration keys to ensure compatibility with both old and new configurations.
        """
        for scenario in Scenario.objects.iterator(chunk_size=100):
            configuration = scenario.configuration
            if "estimated_cost" not in configuration:
                estimated_cost = configuration.get("est_cost", None)
                configuration["estimated_cost"] = estimated_cost
            if "max_area" not in configuration:
                max_area = configuration.get("max_treatment_area_ratio", None)
                configuration["max_area"] = max_area
            scenario.configuration = configuration
            scenario.save(update_fields=["configuration"])

    def _backfill_scenario_excluded_areas(self):
        """
        Backfills the scenario configuration with excluded areas from keys to IDs.
        """
        scenarios = Scenario.objects.exclude(
            configuration__excluded_areas=[],
        )

        legacy_excluded_areas_dataset = Dataset.objects.filter(
            name="Legacy Excluded Areas",
            organization__name=settings.DEFAULT_ORGANIZATION_NAME,
        ).first()

        legacy_excluded_areas = DataLayer.objects.filter(
            dataset=legacy_excluded_areas_dataset,
        ).values_list("name", "id")

        lookup_dict = {name: id for name, id in legacy_excluded_areas}

        for scenario in scenarios.iterator(chunk_size=100):
            configuration = scenario.configuration
            legacy_excluded_areas = configuration.get("excluded_areas", [])
            excluded_areas_ids = [
                lookup_dict.get(area) for area in legacy_excluded_areas
            ]
            configuration["excluded_areas_ids"] = excluded_areas_ids
            scenario.configuration = configuration
            scenario.save(update_fields=["configuration"])
