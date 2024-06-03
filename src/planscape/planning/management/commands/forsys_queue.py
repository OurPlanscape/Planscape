import time
from signal import SIGINT, SIGTERM
from typing import Any

from django.core.management.base import BaseCommand
from planning.models import Scenario, ScenarioResultStatus
from utils.cli_utils import call_forsys
from utils.signals import SignalHandler
from django.conf import settings


class Command(BaseCommand):
    def add_arguments(self, parser) -> None:
        parser.add_argument("--busy-cooldown", type=int, default=1)
        parser.add_argument("--idle-cooldown", type=int, default=5)

    def setup_signals(self):
        signals = [SIGINT, SIGTERM]
        self.handler = SignalHandler(signals)

    def handle(self, *args: Any, **options: Any) -> str | None:
        idle_cooldown = options.get("idle_cooldown")
        busy_cooldown = options.get("busy_cooldown")

        self.setup_signals()

        while True:
            self.stdout.write("[OK] Polling for new scenario...")
            scenario = self.get_scenario()

            if self.handler.caught_signal:
                self.stdout.write(f"Shutting down. Caught {self.handler.caught_signal}")
                break

            if not scenario:
                time.sleep(idle_cooldown)
                continue

            try:
                call_forsys(scenario.pk)
                self.stdout.write(
                    f"[OK] Forsys succeeded for scenario id: {scenario.pk}"
                )
            except Exception as ex:
                # this might be a duplicate from what we have in R,
                # but in reality, the script might fail before booting up.
                scenario.results.status = ScenarioResultStatus.FAILURE
                scenario.results.save()
                self.stderr.write(
                    f"[FAIL] Failed to run forsys for scenario id: {scenario.pk} - {str(ex)}"
                )

            time.sleep(busy_cooldown)

    def get_scenario(self):
        return Scenario.objects.filter(results__status="PENDING").order_by("id").first()
