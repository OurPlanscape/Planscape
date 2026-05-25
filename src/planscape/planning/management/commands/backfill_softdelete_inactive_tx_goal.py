import logging
from typing import Any

from django.core.management.base import BaseCommand

from planning.models import TreatmentGoal

log = logging.getLogger(__name__)


class Command(BaseCommand):
    def handle(self, *args: Any, **options: Any) -> str | None:
        inactive_tx_goals = TreatmentGoal.objects.filter(active=False)

        for inactive_tx_goal in inactive_tx_goals:
            inactive_tx_goal.delete()
