import logging
from typing import Any

from django.core.management.base import BaseCommand
from django.utils import timezone

from impacts.models import TreatmentPlan, TreatmentPlanStatus
from impacts.tasks import async_generate_treatment_plan_geopackage
from planning.models import GeoPackageStatus

log = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Backfill Treatment Plan GeoPackages by queueing generation tasks."

    def add_arguments(self, parser):
        parser.add_argument(
            "--treatment-plan-id",
            type=int,
            help="Only backfill one Treatment Plan by id.",
        )
        parser.add_argument(
            "--regenerate",
            action="store_true",
            help="Regenerate GeoPackages even when a geopackage_url already exists.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would happen without saving changes or queueing tasks.",
        )
        parser.add_argument(
            "--chunk-size",
            type=int,
            default=100,
            help="Number of Treatment Plans to fetch per database batch.",
        )

    def handle(self, *args: Any, **options: Any) -> str | None:
        treatment_plan_id = options.get("treatment_plan_id")
        regenerate = options["regenerate"]
        dry_run = options["dry_run"]
        chunk_size = options["chunk_size"]

        if chunk_size < 1:
            self.stderr.write("--chunk-size must be greater than 0.")
            return

        treatment_plans = TreatmentPlan.objects.all().select_related("scenario")
        if treatment_plan_id:
            treatment_plans = treatment_plans.filter(pk=treatment_plan_id)
            if not treatment_plans.exists():
                self.stderr.write(f"Treatment Plan {treatment_plan_id} does not exist.")
                return

        found_count = treatment_plans.count()
        self.stdout.write(f"Found {found_count} Treatment Plan(s).")

        queued_count = 0
        skipped_existing_count = 0
        skipped_non_success_count = 0
        failed_count = 0

        for treatment_plan in treatment_plans.iterator(chunk_size=chunk_size):
            try:
                if treatment_plan.status != TreatmentPlanStatus.SUCCESS:
                    skipped_non_success_count += 1
                    self.stdout.write(
                        f"Skipping Treatment Plan {treatment_plan.pk}: "
                        f"status is {treatment_plan.status}."
                    )
                    continue

                if treatment_plan.geopackage_url and not regenerate:
                    skipped_existing_count += 1
                    self.stdout.write(
                        f"Skipping Treatment Plan {treatment_plan.pk}: "
                        "geopackage_url already exists."
                    )
                    continue

                action = "Would queue" if dry_run else "Queueing"
                self.stdout.write(
                    f"{action} GeoPackage generation for Treatment Plan "
                    f"{treatment_plan.pk}"
                )

                if not dry_run:
                    treatment_plan.geopackage_status = GeoPackageStatus.PENDING
                    if regenerate:
                        treatment_plan.geopackage_url = None

                    treatment_plan.updated_at = timezone.now()
                    treatment_plan.save(
                        update_fields=[
                            "geopackage_url",
                            "geopackage_status",
                            "updated_at",
                        ]
                    )
                    async_generate_treatment_plan_geopackage.delay(treatment_plan.pk)

                queued_count += 1
            except Exception:
                failed_count += 1
                log.exception(
                    "Failed to queue GeoPackage generation for Treatment Plan %s.",
                    treatment_plan.pk,
                )
                self.stderr.write(f"[FAIL] Treatment Plan {treatment_plan.pk}")

        queue_action = "Would queue" if dry_run else "Queued"
        self.stdout.write(
            f"Done. Found {found_count} Treatment Plan(s). "
            f"{queue_action} {queued_count} GeoPackage generation task(s). "
            f"Skipped {skipped_existing_count} existing GeoPackage(s). "
            f"Skipped {skipped_non_success_count} non-success Treatment Plan(s). "
            f"Failed {failed_count} Treatment Plan(s)."
        )
