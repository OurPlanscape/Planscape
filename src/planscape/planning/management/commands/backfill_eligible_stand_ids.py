import logging
from typing import Any

from django.core.management.base import BaseCommand

from planning.models import Scenario, ScenarioResultStatus
from planning.services import get_eligible_stand_ids

log = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Backfill eligible stand IDs for existing scenarios."

    def add_arguments(self, parser):
        parser.add_argument(
            "--scenario-id",
            type=int,
            help="Only backfill one scenario by ID.",
        )
        parser.add_argument(
            "--overwrite",
            action="store_true",
            help="Recalculate even if eligible_stand_ids already exists.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Calculate without saving changes.",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        scenarios = Scenario.objects.filter(
            result_status=ScenarioResultStatus.SUCCESS,
            forsys_input__has_key="stand_ids",
        )

        if options["scenario_id"] is not None:
            scenarios = scenarios.filter(pk=options["scenario_id"])

        updated = 0
        skipped = 0
        failed = 0

        for scenario in scenarios.iterator(chunk_size=100):
            forsys_input = scenario.forsys_input or {}

            if (
                isinstance(forsys_input.get("eligible_stand_ids"), list)
                and not options["overwrite"]
            ):
                skipped += 1
                continue

            try:
                eligible_ids = get_eligible_stand_ids(scenario)

                if not options["dry_run"]:
                    scenario.forsys_input = {
                        **forsys_input,
                        "eligible_stand_ids": eligible_ids,
                    }
                    scenario.save(update_fields=["forsys_input"])

                updated += 1
                self.stdout.write(
                    f"Scenario {scenario.pk}: {len(eligible_ids)} eligible stands."
                )

            except Exception:
                failed += 1
                log.exception("Failed to backfill scenario %s", scenario.pk)

        self.stdout.write(
            f"Done. Processed: {updated}, skipped: {skipped}, failed: {failed}."
        )
