import logging
import time
from typing import Any

from django.core.management.base import BaseCommand

from planning.models import PlanningArea, PlanningAreaMapStatus
from planning.tasks import prepare_planning_area

log = logging.getLogger(__name__)


class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument("cooldown", type=int, default=60)

    def handle(self, *args: Any, **options: Any) -> str | None:
        cooldown = options.get("cooldown", 60) or 60
        planning_areas = PlanningArea.objects.exclude(
            map_status=PlanningAreaMapStatus.DONE
        )
        total_pas = planning_areas.count()
        self.stdout.write(f"Calculating stand metrics for {total_pas}.")
        for planning_area in planning_areas:
            self.stdout.write(f"Preparing Planning Area {planning_area.pk}")
            try:
                task_count = prepare_planning_area(planning_area_id=planning_area.pk)
                self.stdout.write(
                    f"[OK] Queued prepare_planning_area {planning_area.pk}. Waiting {sleep}."
                )
                total_pas -= 1
                if task_count > 0:
                    time.sleep(cooldown)
                self.stdout.write(f"We have {total_pas} remaining.")
            except Exception:
                self.stderr.write(
                    f"[FAIL] Planning Area failed preparing {planning_area.pk}"
                )
