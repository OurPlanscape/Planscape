import logging
import json
import os
import time
from celery import group, chain
from django.conf import settings
from django.core.management.base import BaseCommand, CommandParser
from django.contrib.auth.models import User
from planning.models import PlanningArea, Scenario
from typing import Any
from planning.tasks import async_forsys_run, review_results

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    fixtures_to_test = []
    scenarios_to_test = []
    test_user = ""

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
            with open(test_defs, "r", encoding="UTF-8") as f:
                self.fixtures_to_test = json.load(f)
        except Exception as e:
            logger.error(f"Failed to read test definitions at {test_defs}- {e}")

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
                    print(f"We have this in s: {s}")
                    self.upsert_scenarios(s["treatment"], s["validation"], area_obj.id)

    def get_results_schema(self, results_file):
        results_path = os.path.join(settings.BASE_DIR, self.fixtures_path, results_file)
        with open(results_path, "r", encoding="UTF-8") as f:
            results_schema = json.load(f)
            print(f"Here is the schema: {results_schema}")
            return results_schema

    def upsert_scenarios(self, scenario_file, results_file, area_id):
        scenario_path = os.path.join(
            settings.BASE_DIR, self.fixtures_path, scenario_file
        )
        with open(scenario_path, "r", encoding="UTF-8") as f:
            scenario_data = json.load(f)
            # overwrite details
            scenario_data["planning_area_id"] = area_id
            scenario_data["name"] = f"test-scenario-{time.time()}"
            scenario_obj, _ = Scenario.objects.update_or_create(
                defaults=scenario_data, id=scenario_data.get("pk") or None
            )
            results_schema = self.get_results_schema(results_file)
            self.scenarios_to_test.append(
                {"id": scenario_obj.id, "results": results_schema}
            )

    def run_tests(self):
        all_tasks = []
        for s in self.scenarios_to_test:
            print(f"We have this in scenarios to test: {s}")
            task = chain(
                async_forsys_run.si(s["id"]), review_results.si(s["id"], s["results"])
            )
            all_tasks.append(task)

        g = group(all_tasks)
        res = g()
        final = res.get()
        print(f"Final Results: {final}")

    def handle(self, *args: Any, **options: Any) -> str | None:
        self.fixtures_path = options["fixtures_path"]
        self.destroy_tests = options["destroy_tests"]

        logger.info(f"Using fixtures path? {self.fixtures_path}")
        logger.info(f"Destroy tests? {self.destroy_tests}")

        self.upsert_test_user()
        self.load_test_definitions()
        self.create_areas()

        self.run_tests()
