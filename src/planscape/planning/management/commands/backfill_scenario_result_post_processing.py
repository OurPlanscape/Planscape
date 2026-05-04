import logging
from typing import Any

from django.core.management.base import BaseCommand

from planning.models import Scenario, ScenarioResultStatus
from planning.services import calculate_and_update_scenario_result

log = logging.getLogger(__name__)


class Command(BaseCommand):
    def handle(self, *args: Any, **options: Any) -> str | None:
        successful_scenarios = Scenario.objects.filter(result_status=ScenarioResultStatus.SUCCESS)

        for scenario in successful_scenarios:
            try:
                calculate_and_update_scenario_result(scenario)
            except Exception:
                logging.exception("Failed to backfill post-processing data.", extra={"scenario": scenario.pk})