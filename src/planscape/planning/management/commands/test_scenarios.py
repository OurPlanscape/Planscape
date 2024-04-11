import logging
import json
import os
from datetime import datetime
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand, CommandParser
from django.contrib.auth.models import User
from celery import group, chain, shared_task
from planning.models import PlanningArea, Scenario
from planning.tasks import async_forsys_run
from planning.e2e.tasks import review_results
from planning.e2e.validation import load_schema
from planning.e2e.scenario_test import E2EScenarioTest

log = logging.getLogger(__name__)


class Command(BaseCommand):
    def add_arguments(self, parser: CommandParser) -> None:
        """Defines any arguments for our CLI command"""
        parser.add_argument(
            "--fixtures-path",
            type=str,
            default=str(settings.TREATMENTS_TEST_FIXTURES_PATH),
            help="Overrides the default path to fixtures",
        )

    def handle(self, *args: Any, **options: Any) -> str | None:
        """Runs the CLI command. Outputs results to logs and stdout"""
        fixtures_path = options["fixtures_path"]
        e2etest = E2EScenarioTest(async_context=False)
        e2etest.initiate_tests(fixtures_path)
