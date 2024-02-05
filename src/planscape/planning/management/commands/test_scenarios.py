import logging
import json
import os
import time
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand, CommandParser
from django.contrib.auth.models import User
from celery import group, chain, chord
from planning.models import PlanningArea, Scenario
from planning.tasks import async_forsys_run
from planning.e2e.tasks import review_results
from planning.e2e.validation import load_schema

log = logging.getLogger(__name__)


class Command(BaseCommand):
    fixtures_to_test = []
    scenarios_to_test = []
    test_user = ""
    fixtures_path = str(settings.TREATMENTS_TEST_FIXTURES_PATH)

    def upsert_test_user(self):
        self.test_user, _ = User.objects.update_or_create(
            username="e2etest@sig-gis.com"
        )
        self.stdout.write(
            f"Setting test user id: {self.test_user.id} and username: {self.test_user.username}"
        )

    def load_test_definitions(self):
        test_defs = os.path.join(
            settings.BASE_DIR, self.fixtures_path, "test_definitions.json"
        )
        try:
            with open(test_defs, "r", encoding="UTF-8") as f:
                self.fixtures_to_test = json.load(f)
        except Exception as e:
            log.error(f"Failed to read test definitions at {test_defs}- {e}")

    # TODO: consider just reading files in the output directory formats

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
            with open(areas_file, "r", encoding="UTF-8") as f:
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
                    self.upsert_scenarios(s["treatment"], s["expected"], area_obj.id)

    def upsert_scenarios(self, scenario_file, validation_file, area_id):
        scenario_path = os.path.join(
            settings.BASE_DIR, self.fixtures_path, scenario_file
        )
        with open(scenario_path, "r", encoding="UTF-8") as f:
            scenario_data = json.load(f)
            # Remove attributes that might exist if our scenario is from the CSV output
            if "planning_area" in scenario_data:
                del scenario_data["planning_area"]

            # overwrite details with new planning details
            scenario_data["planning_area_id"] = area_id
            scenario_data["name"] = f"test-scenario-{time.time()}"
            scenario_obj, _ = Scenario.objects.update_or_create(
                defaults=scenario_data, id=scenario_data.get("pk") or None
            )
            validation_schema = load_schema(validation_file)
            self.scenarios_to_test.append(
                {"id": scenario_obj.id, "schema": validation_schema}
            )

    def run_tests(self):
        all_tasks = []
        # here we are chaining the forsys run, then a results validation function
        for s in self.scenarios_to_test:
            task = chain(
                async_forsys_run.si(s["id"]), review_results.si(s["id"], s["schema"])
            )
            all_tasks.append(task)

        task_group = group(all_tasks)
        task_results = task_group()
        self.final_results = task_results.get()

        log.info(f"Final Results: {self.final_results}")
        self.stdout.write(f"Final Results: {self.final_results}")

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--fixtures-path",
            type=str,
            default=str(settings.TREATMENTS_TEST_FIXTURES_PATH),
            help="Overrides the default path to fixtures",
        )

    def post_process(self):
        self.stdout.write("Tests completed.")

    def handle(self, *args: Any, **options: Any) -> str | None:
        self.fixtures_path = options["fixtures_path"]

        if self.fixtures_path:
            self.stdout.write(f"Fixtures path is set to: {self.fixtures_path}")

        self.upsert_test_user()
        self.load_test_definitions()
        self.create_areas()

        self.run_tests()
