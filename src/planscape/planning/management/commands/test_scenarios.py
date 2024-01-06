import logging
import json
import os
from typing import Any
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.contrib.auth.models import User
from planning.models import PlanningArea

logger = logging.getLogger(__name__)

class Command(BaseCommand):

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--fixtures-path",
            type=str,
            default=str(settings.TREATMENTS_TEST_FIXTURES_PATH),
            help="Overrides the default path to fixtures"
        )

        parser.add_argument(
            "--destroy-tests",
            default=False,
            help="Removes any data that is created during the test.",
        )

    def upsert_test_user(self):
        self.test_user, created = User.objects.update_or_create(username="e2etest")
        self.test_user.set_password("12345")
        # if created:
        #     self.test_user.save()
        print(f"The test user id: {self.test_user.id} and username: {self.test_user.username}")
    
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
            area_file = os.path.join(
                settings.BASE_DIR,
                self.fixtures_path,
                planning_area_file,
            )
            with open(area_file,
                        "r",
                    ) as area_file:
                area_data = json.load(area_file)
                area, created = PlanningArea.objects.update_or_create(area_data)
                print(f"area info: {area.id}")
                self.test_area_ids.append(area.id)

    def read_scenario(self, scenario):
        scenario_path = os.path.join(
            settings.BASE_DIR,
            self.fixtures_path,
            "scenarios/",
            scenario["scenario"],
        )
        with open(
            scenario_path,
            "r",
        ) as scenario_data:
            scenario_json = json.load(scenario_data)
        return scenario_json

    def create_scenario(self, scenario_json):
        self.client.force_login(self.user)
        response = self.client.post(
            reverse("planning:create_scenario"),
            scenario_json,
            content_type="application/json",
        )
        res_data = json.loads(response.content)
        self.assertEquals(response.status_code, 200, "Creating the Scenario Failed")
        return res_data["id"]

    def test_scenarios(self):
        self.client.force_login(self.user)
        try:
            for tests in self.fixtures_to_test:
                with self.subTest(f"Testing Area Fixture: {tests['planning_area']}"):
                    planning_area_file = tests["planning_area"]
                    test_file_path = os.path.join(
                        settings.BASE_DIR,
                        self.fixtures_path,
                        planning_area_file,
                    )
                    with open(
                        test_file_path,
                        "r",
                    ) as planning_file:
                        planning_area_data = json.load(planning_file)
                    area_id = self.create_area(planning_area_data)
                    scenarios = tests["treatment_scenarios"]
                    for scenario in scenarios:
                        with self.subTest(
                            f"Testing: {tests['planning_area']} with {scenario['scenario']}"
                        ):
                            scenario_json = self.read_scenario(scenario)
                            scenario_json["planning_area"] = str(area_id)

                            # TODO: in order to test fixtures that are intended to fail,
                            #   we should confirm the intended outcome matches here
                            scenario_id = self.create_scenario(scenario_json)

                            scenario = Scenario.objects.get(pk=scenario_id)
                            print(f"\nRunning forsys for scenario_id: {scenario_id}")

                            self.get_forsys_results(scenario_id)
                            # check for PENDING results....

                            scenario_result = ScenarioResult.objects.get(
                                scenario__id=scenario_id
                            )
                            print(f"Result status?: {scenario_result.status}")
                            while scenario_result.status == "PENDING":
                                time.sleep(2)
                                scenario_result = ScenarioResult.objects.get(
                                    scenario__id=scenario_id
                                )
                                existing = Scenario.objects.count()
                                print(f"We have this many scenarios: {existing}")
                                print(f"new result is: {scenario_result.status}")

                            # then fetch the metrics from the backend

                    self.assertEqual(PlanningArea.objects.count(), 1)
        except Exception as e:
            print(f"Failed with {e}")

    def handle(self, *args: Any, **options: Any) -> str | None:
        self.fixtures_path = options["fixtures_path"]
        self.destroy_tests = options["destroy_tests"]

        logger.info(f"Using fixtures path? {self.fixtures_path}")
        logger.info(f"Destroy tests? {self.destroy_tests}")

        self.upsert_test_user()
        self.load_test_definitions()
        print(f"self.fixtures_to_test: {self.fixtures_to_test}")

        self.create_areas()
        print(f"Area ids we created: {self.test_area_ids}")

        print("upsert test areas")
        print("upsert test scenarios")

