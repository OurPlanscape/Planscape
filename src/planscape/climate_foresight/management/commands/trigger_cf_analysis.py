"""
Management command to trigger Climate Foresight analysis for testing.

Usage:
    python manage.py trigger_cf_analysis <run_id>
"""

from django.core.management.base import BaseCommand, CommandError

from climate_foresight.models import ClimateForesightRun
from climate_foresight.orchestration import start_climate_foresight_analysis


class Command(BaseCommand):
    help = "Trigger Climate Foresight analysis (same as POST to /run_analysis)"

    def add_arguments(self, parser):
        parser.add_argument(
            "run_id",
            type=int,
            help="ID of the ClimateForesightRun to analyze",
        )

    def handle(self, *args, **options):
        run_id = options["run_id"]

        try:
            run = ClimateForesightRun.objects.get(id=run_id)
        except ClimateForesightRun.DoesNotExist:
            raise CommandError(f"Run with id={run_id} does not exist")

        self.stdout.write(self.style.SUCCESS(f"\nTriggering analysis for: {run.name}"))
        self.stdout.write(f"Status: {run.status}")
        self.stdout.write(f"Input layers: {run.input_datalayers.count()}")

        # This calls the same function as POST /run_analysis endpoint
        try:
            result = start_climate_foresight_analysis(run_id)
            self.stdout.write(self.style.SUCCESS(f"\n{result}"))
        except ValueError as e:
            raise CommandError(str(e))
