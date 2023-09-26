import time
from typing import Any
from django.core.management.base import BaseCommand
from planning.models import Scenario
from utils.cli_utils import call_forsys


class Command(BaseCommand):
    def add_arguments(self, parser) -> None:
        parser.add_argument("--busy-cooldown", type=int, default=1)
        parser.add_argument("--idle-cooldown", type=int, default=5)

    def handle(self, *args: Any, **options: Any) -> str | None:
        idle_cooldown = options.get("idle_cooldown")
        busy_cooldown = options.get("busy_cooldown")
        while True:
            self.stdout.write("[OK] Polling for new scenario...")
            scenario = self.get_scenario()
            if not scenario:
                time.sleep(idle_cooldown)
                continue

            try:
                call_forsys(scenario.pk)
                self.stdout.write(
                    f"[OK] Forsys succeeded for scenario id: {scenario.pk}"
                )
            except Exception as ex:
                self.stderr.write(
                    f"[FAIL] Failed to run forsys for scenario id: {scenario.pk}"
                )

            time.sleep(busy_cooldown)

    def get_scenario(self):
        return Scenario.objects.filter(results__status="PENDING").order_by("id").first()
