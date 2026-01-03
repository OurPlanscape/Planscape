from django.core.management.base import BaseCommand
from django.db.models import Count, Q

from planning.models import PlanningArea, ScenarioStatus


class Command(BaseCommand):
    help = (
        "Backfill PlanningArea.scenario_count to match ACTIVE Scenario count "
        "(does not touch updated_at)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show how many rows would change, but do not update anything.",
        )
        parser.add_argument(
            "--pa-id",
            action="append",
            type=int,
            dest="pa_ids",
            help="PlanningArea ID to backfill (repeat flag to include multiple).",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        pa_ids = options.get("pa_ids") or []

        base_qs = PlanningArea.objects.filter(deleted_at__isnull=True)
        if pa_ids:
            base_qs = base_qs.filter(id__in=pa_ids)

        planning_areas = base_qs.annotate(
            active_count=Count(
                "scenarios",
                filter=Q(
                    scenarios__status=ScenarioStatus.ACTIVE,
                    scenarios__deleted_at__isnull=True,
                ),
            )
        ).values_list("id", "scenario_count", "active_count")

        changed = 0
        for pa_id, stored, active in planning_areas:
            stored_val = stored or 0
            if stored_val != active:
                changed += 1
                if not dry_run:
                    PlanningArea.objects.filter(id=pa_id).update(scenario_count=active)

        scope = f" for PA ids {pa_ids}" if pa_ids else ""
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"[DRY RUN] Would update {changed} PlanningArea rows{scope}."
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f"Updated {changed} PlanningArea rows{scope}.")
            )
