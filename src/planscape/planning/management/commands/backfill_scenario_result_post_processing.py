import logging
from typing import Any

from django.core.management.base import BaseCommand

from planning.models import Scenario, ScenarioResultStatus
from planning.services import (
    calculate_and_update_scenario_result,
    export_to_geopackage,
)

log = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Backfill scenario post-processing data, optionally regenerating GeoPackages."

    def add_arguments(self, parser):
        parser.add_argument(
            "--scenario-id",
            type=int,
            help="Only backfill one scenario by id.",
        )
        parser.add_argument(
            "--regenerate-geopackages",
            action="store_true",
            help="Also regenerate GeoPackages after backfilling scenario results.",
        )
        parser.add_argument(
            "--only-existing-geopackages",
            action="store_true",
            help=(
                "Only regenerate GeoPackages for scenarios that already have a "
                "geopackage_url. Requires --regenerate-geopackages."
            ),
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print what would happen without saving changes.",
        )

    def handle(self, *args: Any, **options: Any) -> str | None:
        scenario_id = options.get("scenario_id")
        regenerate_geopackages = options["regenerate_geopackages"]
        only_existing_geopackages = options["only_existing_geopackages"]
        dry_run = options["dry_run"]

        if only_existing_geopackages and not regenerate_geopackages:
            self.stderr.write(
                "--only-existing-geopackages requires --regenerate-geopackages."
            )
            return

        successful_scenarios = Scenario.objects.filter(
            result_status=ScenarioResultStatus.SUCCESS
        ).select_related("results", "treatment_goal")

        if scenario_id:
            successful_scenarios = successful_scenarios.filter(pk=scenario_id)

        total = successful_scenarios.count()

        self.stdout.write(f"Found {total} successful scenario(s).")

        backfilled_count = 0
        geopackage_count = 0
        skipped_geopackage_count = 0
        failed_count = 0

        for scenario in successful_scenarios.iterator(chunk_size=100):
            try:
                self.stdout.write(f"Backfilling scenario {scenario.pk}")

                if not dry_run:
                    calculate_and_update_scenario_result(scenario)

                backfilled_count += 1

                if regenerate_geopackages:
                    if only_existing_geopackages and not scenario.geopackage_url:
                        skipped_geopackage_count += 1
                        self.stdout.write(
                            f"Skipping GeoPackage for scenario {scenario.pk}: "
                            "no existing geopackage_url."
                        )
                        continue

                    self.stdout.write(
                        f"Regenerating GeoPackage for scenario {scenario.pk}"
                    )

                    if not dry_run:
                        geopackage_url = export_to_geopackage(
                            scenario,
                            regenerate=True,
                        )

                        if not geopackage_url:
                            raise RuntimeError(
                                f"GeoPackage regeneration failed for scenario {scenario.pk}"
                            )

                    geopackage_count += 1

            except Exception:
                failed_count += 1
                log.exception(
                    "Failed to backfill scenario %s.",
                    scenario.pk,
                )
                self.stderr.write(f"[FAIL] Scenario {scenario.pk}")

        self.stdout.write(
            f"Done. Backfilled {backfilled_count} scenario result(s). "
            f"Regenerated {geopackage_count} GeoPackage(s). "
            f"Skipped {skipped_geopackage_count} GeoPackage(s). "
            f"Failed {failed_count} scenario(s)."
        )