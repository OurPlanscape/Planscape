import logging
import json
import os
import time
from celery import chord, group
from django.conf import settings
from django.core.management.base import BaseCommand, CommandParser
from django.contrib.auth.models import User
from planning.models import PlanningArea, Scenario, ScenarioResult, ScenarioResultStatus
from subprocess import CalledProcessError, TimeoutExpired
from typing import Any
from planning.tasks import async_forsys_run
from utils.cli_utils import call_forsys
from planscape.celery import app

logger = logging.getLogger(__name__)

@app.task
def my_callback(a: int):
    # Process the result here
    print(f"Callback called {a}")
    return "what"


class Command(BaseCommand):
    fixtures_to_test = []
    scenarios_to_test = []

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--fixtures-path",
            type=str,
            default=str(settings.TREATMENTS_TEST_FIXTURES_PATH),
            help="Overrides the default path to fixtures",
        )

        parser.add_argument(
            "--destroy-tests",
            default=False,
            help="Removes any data that is created during the test.",
        )

    def upsert_test_user(self):
        self.test_user, _ = User.objects.update_or_create(
            username="e2etest@sig-gis.com"
        )
        self.stdout.write(
            f"The test user id: {self.test_user.id} and username: {self.test_user.username}"
        )

    def load_test_definitions(self):
        test_defs = os.path.join(
            settings.BASE_DIR, self.fixtures_path, "test_definitions.json"
        )
        try:
            with open(test_defs, "r") as f:
                self.fixtures_to_test = json.load(f)
        except Exception as e:
            logger.error(f"Failed to read test definitions at {test_defs}- {e}")

    def create_areas(self):
        self.test_area_ids = []
        for tests in self.fixtures_to_test:
            planning_area_file = tests["planning_area"]
            scenarios = tests["scenarios"]
            areas_file = os.path.join(
                settings.BASE_DIR,
                self.fixtures_path,
                planning_area_file,
            )
            with open(
                areas_file,
                "r",
            ) as f:
                area_data = json.load(f)
                area_data["user_id"] = self.test_user.id
                area_data["pk"] = None
                area_data["name"] = f"testplan-{time.time()}"
                area_obj, _ = PlanningArea.objects.update_or_create(
                    id=area_data.get("pk") or None,
                    defaults=area_data,
                )
                self.test_area_ids.append(area_obj.id)
                for s in scenarios:
                    self.upsert_scenarios(s, area_obj.id)

    def upsert_scenarios(self, scenario_file, area_id):
        scenario_path = os.path.join(
            settings.BASE_DIR, self.fixtures_path, scenario_file
        )
        with open(
            scenario_path,
            "r",
        ) as f:
            scenario_data = json.load(f)
            # overwrite details
            scenario_data["planning_area_id"] = area_id
            scenario_data["name"] = f"test-scenario-{time.time()}"
            scenario_obj, _ = Scenario.objects.update_or_create(
                defaults=scenario_data, id=scenario_data.get("pk") or None
            )
            self.scenarios_to_test.append(scenario_obj.id)

    def run_tests(self):
        all_tasks = [] 
        for sid in self.scenarios_to_test:
            task = async_forsys_run.si(sid).link(my_callback.si(sid))
            all_tasks.append(task)
        g = group(all_tasks)
        res = g(my_callback.si())
        print(f"{ res.get() }")

    def handle(self, *args: Any, **options: Any) -> str | None:
        self.fixtures_path = options["fixtures_path"]
        self.destroy_tests = options["destroy_tests"]

        logger.info(f"Using fixtures path? {self.fixtures_path}")
        logger.info(f"Destroy tests? {self.destroy_tests}")

        self.upsert_test_user()
        self.load_test_definitions()
        self.create_areas()

        self.run_tests()
