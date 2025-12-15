import logging
import time
from typing import Any

from django.core.management.base import BaseCommand

from planning.models import PlanningArea, PlanningAreaMapStatus
from planning.tasks import prepare_planning_area

log = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Prepare planning areas by queuing stand-metric jobs."

    def add_arguments(self, parser):
        parser.add_argument(
            "cooldown",
            type=int,
            nargs="?",
            default=60,
            help=(
                "Seconds to wait between running the prepare_planning_area task "
                "on each planning area (default: 60)."
            ),
        )
        parser.add_argument(
            "--only-done",
            action="store_true",
            help="Only process planning areas with map_status = DONE.",
        )
        parser.add_argument(
            "--include-done",
            action="store_true",
            help="Include planning areas with map_status = DONE instead of skipping them.",
        )
        parser.add_argument(
            "--planning-area-id",
            type=int,
            help="Only process a single planning area (by id).",
        )

    def handle(self, *args: Any, **options: Any) -> str | None:
        cooldown_seconds: int = options.get("cooldown", 60) or 60
        only_done: bool = options["only_done"]
        include_done: bool = options["include_done"]
        planning_area_id: int | None = options.get("planning_area_id")

        if only_done and include_done:
            self.stderr.write(
                "You cannot use --only-done and --include-done together. "
                "Choose one or neither."
            )
            return

        if planning_area_id is not None:
            try:
                planning_area = PlanningArea.objects.get(pk=planning_area_id)
            except PlanningArea.DoesNotExist:
                self.stderr.write(f"No PlanningArea found with id={planning_area_id}.")
                return

            if planning_area.map_status == PlanningAreaMapStatus.OVERSIZE:
                self.stderr.write(
                    f"PlanningArea {planning_area_id} has map_status=OVERSIZE "
                    "and will not be processed."
                )
                return

            planning_areas = PlanningArea.objects.filter(pk=planning_area_id)
        else:
            planning_areas = PlanningArea.objects.all()

            if only_done:
                planning_areas = planning_areas.filter(
                    map_status=PlanningAreaMapStatus.DONE
                )
            elif include_done:
                pass
            else:
                planning_areas = planning_areas.exclude(
                    map_status=PlanningAreaMapStatus.DONE
                )

            planning_areas = planning_areas.exclude(
                map_status=PlanningAreaMapStatus.OVERSIZE
            )

        total_planning_areas: int = planning_areas.count()
        if total_planning_areas == 0:
            self.stdout.write(
                "No planning areas matched the given filters "
                "(OVERSIZE planning areas are always excluded)."
            )
            return

        self.stdout.write(
            f"Calculating stand metrics for {total_planning_areas} planning areas "
            "(OVERSIZE planning areas are always excluded)."
        )

        remaining = total_planning_areas

        for planning_area in planning_areas.iterator():
            self.stdout.write(f"Preparing Planning Area {planning_area.pk}")
            try:
                task_count = prepare_planning_area(planning_area_id=planning_area.pk)
                self.stdout.write(
                    f"[OK] Queued prepare_planning_area for {planning_area.pk}. "
                    f"Waiting {cooldown_seconds} seconds."
                )

                remaining -= 1

                if task_count > 0 and cooldown_seconds > 0:
                    time.sleep(cooldown_seconds)

                self.stdout.write(f"We have {remaining} planning areas remaining.")
            except Exception:
                log.exception(
                    "Planning Area %s failed while preparing.", planning_area.pk
                )
                self.stderr.write(
                    f"[FAIL] Planning Area failed preparing {planning_area.pk}"
                )
