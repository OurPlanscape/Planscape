import logging
import json
from typing import Any

from django.core.management.base import BaseCommand, CommandParser
from e2e.tasks import E2EImpactsTests

log = logging.getLogger(__name__)


class Command(BaseCommand):
    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--config_file",
            type=str,
            help="E2E configuration file path",
        )

    def handle(self, *args: Any, **options: Any) -> str | None:
        log.info("Running E2E Impacts Tests")
        config_file_path = options["config_file"]
        with open(config_file_path, "r") as config_file:
            config = json.load(config_file)

        e2etest = E2EImpactsTests(config=config)
        e2etest.run_tests()
        log.info("E2E Impacts Tests completed")
