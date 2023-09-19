import argparse
import json
import logging
import random
import time

from datetime import datetime
from django.core.management.base import BaseCommand
from django.db import transaction

from planning.models import Scenario, ScenarioResultStatus, ScenarioResult
from forsys.services import run_scenario


class Command(BaseCommand):
    help = "Evaluates a specific scenario."

    # TODO: configure a dedicated logger in settings.py for this command.
    logger = logging.getLogger(__name__)

    def add_arguments(self, parser):
        parser.add_argument("scenario_id", type=int)
        parser.add_argument(
            "--dry_run",
            type=bool,
            default=False,
            action=argparse.BooleanOptionalAction,
            help="Show the commands to be run but do not run them."
            "Makes no changes to the database and does not call forsys.",
        )
        parser.add_argument(
            "--fake_run",
            type=bool,
            default=False,
            action=argparse.BooleanOptionalAction,
            help="Fake an evaluation and write dummy data for a scenario.",
        )
        parser.add_argument(
            "--fake_run_time",
            type=int,
            default=60,
            required=False,
            help="Sets the run duration in seconds for a fake run",
        )
        parser.add_argument(
            "--fake_run_failure_rate",
            type=int,
            default=0,
            required=False,
            help="During a fake run, set the failure rate (0-100).",
        )

    def handle(self, *args, **options):
        scenario_id = options["scenario_id"]
        dry_run = options["dry_run"]
        fake_run = options["fake_run"]
        fake_run_time = options["fake_run_time"]
        fake_run_failure_rate = options["fake_run_failure_rate"]

        try:
            run_scenario(
                scenario_id, dry_run, fake_run, fake_run_time, fake_run_failure_rate
            )
            self.logger.info("Successfully evaluated scenario %d" % scenario_id)
        except Exception as e:
            # Log any exception, but then throw it again to generate a failed exit code.
            self.logger.critical(str(e))
            raise e
