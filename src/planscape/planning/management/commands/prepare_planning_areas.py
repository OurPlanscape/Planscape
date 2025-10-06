import logging
from typing import Any

from django.core.management.base import BaseCommand
from django.utils import timezone

from planning.models import PlanningArea, PlanningAreaMapStatus
from planning.tasks import prepare_planning_area

log = logging.getLogger(__name__)


class Command(BaseCommand):
    def handle(self, *args: Any, **options: Any) -> str | None:
        planning_areas = PlanningArea.objects.exclude(
            map_status=PlanningAreaMapStatus.DONE
        )
        for planning_area in planning_areas:
            start = timezone.now()
            self.stdout.write(f"Preparing Planning Area {planning_area.pk} - {start}")
            try:
                prepare_planning_area(planning_area_id=planning_area.pk)
                end = timezone.now()
                total_time = end - start
                self.stdout.write(
                    f"[OK] Planning Area Prepared {planning_area.pk} - {end}\nTotal Time: {total_time.total_seconds()/60} minutes."
                )
            except Exception:
                self.stderr.write(
                    f"[FAIL] Planning Area failed preparing {planning_area.pk}"
                )
