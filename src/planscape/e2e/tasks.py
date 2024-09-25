from datetime import datetime
from django.contrib.auth import get_user_model
import os
import logging
import json
import sentry_sdk

from celery import chain, group, shared_task

from planning.models import PlanningArea, Scenario
from planning.tasks import async_forsys_run
from planscape.celery import app
from e2e.validation import load_schema, validation_results
from django.conf import settings

log = logging.getLogger(__name__)
User = get_user_model()


@shared_task
def run_e2e_test():
    log.info("Running scheduled e2e test")
    e2etest = E2EScenarioTest()
    e2etest.initiate_tests()


class E2EScenarioTest:
    fixtures_to_test = []
    scenarios_to_test = []
    test_user_name = "e2etest@sig-gis.com"
    fixtures_path = str(settings.TREATMENTS_TEST_FIXTURES_PATH)
    async_context = False

    def __init__(self, async_context=True, fixtures_path=None) -> None:
        self.async_context = async_context
        if fixtures_path:
            log.info(f"Fixtures path is set to: {self.fixtures_path}")
            self.fixtures_path = fixtures_path

    def initiate_tests(self):
        self.load_test_definitions()
        self.upsert_test_user()
        self.create_areas()
        self.run_tests()

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
            raise

    def upsert_test_user(self):
        """Upserts the same test user for all test records"""
        self.test_user, _ = User.objects.update_or_create(username=self.test_user_name)
        print(
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
            if "uuid" in scenario_data:
                del scenario_data["uuid"]

            # overwrite details for new scenario to be upserted
            scenario_data["planning_area_id"] = area_id
            scenario_data["name"] = f"test-scenario-{scenario_data.get('name')}"
            scenario_data["user_id"] = self.test_user.id

            # upsert this, using name and user as unique identifier
            # we don't want to use a PK here, because it may interfere with new data
            scenario_obj, _ = Scenario.objects.update_or_create(
                user=self.test_user, name=scenario_data["name"], defaults=scenario_data
            )

            validation_schema = load_schema(validation_file)
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

        if self.async_context:
            task_group()
        else:
            task_results = task_group()
            self.final_results = task_results.get()
            self.output_results()

            for f in self.final_results:
                result_obj = json.loads(f)
                if "result" in result_obj and result_obj["result"] == "FAILED":
                    raise SystemError("tests failed")

    def output_results(self):
        dt = datetime.now()
        print(f"\nTest results {dt}:\n")
        log.info(f"Test results {dt}")
        for f in self.final_results:
            log.info(f"{json.loads(f)}")
            print(f"{json.loads(f)}")


@app.task(max_retries=3, retry_backoff=True)
def review_results(sid, validation_schema) -> object:
    try:
        scenario = Scenario.objects.get(id=sid)
        res = scenario.results.result
        if scenario.results.status != "SUCCESS":
            error_message = (
                f"Forsys FAILED to process scenario: {scenario.id} {scenario.name}"
            )
            sentry_sdk.capture_message(error_message)
            return json.dumps(
                {
                    "result": "FAILED",
                    "scenario_id": sid,
                    "details": error_message,
                }
            )
        return validation_results(sid, validation_schema, res)
    except Exception:
        log.error("ERROR: Could not get a scenario result for scenario id %s", sid)
        raise
