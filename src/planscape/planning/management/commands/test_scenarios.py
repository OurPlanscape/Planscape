import logging
import json
import os
from datetime import datetime
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand, CommandParser
from django.contrib.auth.models import User
from celery import group, chain
from planning.models import PlanningArea, Scenario
from planning.tasks import async_forsys_run
from planning.e2e.tasks import review_results
from planning.e2e.validation import load_json_file, do_schema_validation
from utils.file_utils import load_json_file

log = logging.getLogger(__name__)


class Command(BaseCommand):
    fixtures_to_test = []
    scenarios_to_test = []
    test_user_name = "e2etest@sig-gis.com"
    fixtures_path = str(settings.TREATMENTS_TEST_FIXTURES_PATH)

    def load_test_definitions(self):
        """Reads the JSON file that describes our test areas, scenarios and expected results"""
        test_defs = os.path.join(
            settings.BASE_DIR, self.fixtures_path, "test_definitions.json"
        )
        try:
            with open(test_defs, "r", encoding="UTF-8") as f:
                self.fixtures_to_test = json.load(f)
        except Exception as e:
            log.error(f"Failed to read test definitions at {test_defs}- {e}")

    def upsert_test_user(self):
        """Upserts the same test user for all test records"""
        self.test_user, _ = User.objects.update_or_create(username=self.test_user_name)
        self.stdout.write(
            f"Setting test user id: {self.test_user.id} and username: {self.test_user.username}"
        )

    def create_areas(self):
        """Loads the test planning areas under our test user"""
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
                # Remove attributes that might exist if our planning area is from the CSV output
                if "pk" in area_data:
                    del area_data["pk"]

                # overwrite details for new planning area to be upserted
                area_data["user_id"] = self.test_user.id
                area_data["name"] = f"testplan-{area_data.get('name')}"

                # upsert this, using name and user as unique identifier
                # we don't want to use a PK here, because it may interfere with new data
                area_obj, _ = PlanningArea.objects.update_or_create(
                    user_id=area_data["user_id"],
                    name=area_data["name"],
                    defaults=area_data,
                )
                self.test_area_ids.append(area_obj.id)
                for s in scenarios:
                    self.upsert_scenarios(s["treatment"], s["expected"], area_obj.id)

    def upsert_scenarios(self, scenario_file, validation_file, area_id):
        """Upserts each scenario"""
        scenario_path = os.path.join(
            settings.BASE_DIR, self.fixtures_path, scenario_file
        )
        with open(scenario_path, "r", encoding="UTF-8") as f:
            scenario_data = json.load(f)
            # Remove attributes that might exist if our scenario is from the CSV output
            if "planning_area" in scenario_data:
                del scenario_data["planning_area"]
            if "pk" in scenario_data:
                del scenario_data["pk"]
            if "id" in scenario_data:
                del scenario_data["id"]
            if "uuid" in scenario_data:
                del scenario_data["uuid"]

            # overwrite details for new scenario to be upserted
            scenario_data["planning_area_id"] = area_id
            scenario_data["name"] = f"test-scenario-{scenario_data.get('name')}"
            scenario_data["user_id"] = self.test_user.id

            # upsert this, using name and user as unique identifier
            # we don't want to use a PK here, because it may interfere with new data
            scenario_obj, _ = Scenario.objects.update_or_create(
                user=self.test_user,
                name=scenario_data["name"],
                planning_area_id=area_id,
                defaults=scenario_data,
            )
            validation_path = os.path.join(
                settings.BASE_DIR, self.fixtures_path, validation_file
            )
            validation_schema = load_json_file(validation_path)
            self.scenarios_to_test.append(
                {"id": scenario_obj.id, "schema": validation_schema}
            )

    def run_tests(self):
        """Triggers processing for each of the scenarios in our tests"""
        all_tasks = []
        # here we are pushing the forsys runs to Celery for processing
        # We then chain the JSON results and send them to a validation function
        for s in self.scenarios_to_test:
            task = chain(
                async_forsys_run.si(s["id"]), review_results.si(s["id"], s["schema"])
            )
            all_tasks.append(task)

        task_group = group(all_tasks)
        task_results = task_group()
        self.final_results = task_results.get()
        self.output_results()

    def output_results(self):
        dt = datetime.now()
        self.stdout.write(f"\nTest results {dt}:\n")
        log.info(f"Test results {dt}")
        for f in self.final_results:
            log.info(f"{json.loads(f)}")
            self.stdout.write(f"{json.loads(f)}")

    def add_arguments(self, parser: CommandParser) -> None:
        """Defines any arguments for our CLI command"""
        parser.add_argument(
            "--fixtures-path",
            type=str,
            default=str(settings.TREATMENTS_TEST_FIXTURES_PATH),
            help="Overrides the default path to fixtures",
        )
        parser.add_argument(
            "--check-result-file",
            type=str,
            help="For debugging tests. With --check-schema-file, this compares a json file against a given schema.",
        )
        parser.add_argument(
            "--check-schema-file",
            type=str,
            help="For debugging tests. --check-result-file, this compares a json file against a given schema.",
        )

    def compare_validation(self, result_file, schema_file):
        # load json, load schema
        try:
            schema_data = load_json_file(schema_file)
            result_data = load_json_file(result_file)
        except Exception as e:
            print(f"Could not load file: {e}")
        validation_results = do_schema_validation("Test", schema_data, result_data)
        print(f"Results: {validation_results}")

    def handle(self, *args: Any, **options: Any) -> str | None:
        """Runs the CLI command. Outputs results to logs and stdout"""
        self.fixtures_path = options["fixtures_path"]

        # this will just run the validation to compare a json file against a schema file
        if options["check_schema_file"] and options["check_result_file"]:
            schema_path = options["check_schema_file"]
            result_path = options["check_result_file"]
            self.compare_validation(schema_path, result_path)
        elif options["check_schema_file"] or options["check_result_file"]:
            self.stdout.write(
                "To compare schemas, you must provide both a schema file with --check-schema-file and a result file with --check-result-file."
            )
        else:

            if self.fixtures_path:
                self.stdout.write(f"Fixtures path is set to: {self.fixtures_path}")

            self.load_test_definitions()
            self.upsert_test_user()
            self.create_areas()

            self.run_tests()
