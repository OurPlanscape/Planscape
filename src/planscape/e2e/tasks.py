from datetime import datetime
from django.contrib.auth import get_user_model
import os
import logging
import json
import sentry_sdk
import time

from celery import chain, group, shared_task

from django.urls import reverse
from rest_framework.test import APIClient
from planning.models import PlanningArea, Scenario
from planning.tasks import async_forsys_run
from stands.models import Stand
from impacts.models import (
    TreatmentResult,
    TreatmentPlan,
    TreatmentPlanStatus,
)
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


class E2EImpactsTests:
    """
    TBD: End-to-end tests for impacts features
    * Create Treatment Plan
    * Fill up prescriptions
    * Execute impacts
    * Analyze results
    * Delete Treatment Plan
    """

    def __init__(self, config: dict) -> None:
        self.client = APIClient()
        user_id = config.get("user_id")
        scenario_id = config.get("scenario_id")
        self.user = User.objects.get(id=user_id)
        self.client.force_authenticate(user=self.user)

        self.scenario = Scenario.objects.get(id=scenario_id)

        """
        [
            {"action": "action_name", "project_area_id": 1, "stand_ids": [1, 2, 3]},
        ]
        """
        self.prescriptions = config.get("prescriptions", [])

        """
        [
            {"stand_id": 1, [
                {"variable": "FL", "value": 0.1, "baseline": 0.2, "delta": 0.1, "year": 2024},
                {"variable": "FL", "value": 0.2, "baseline": 0.2, "delta": 0, "year": 2029},]
            },
            {"stand_id": 2, [
                {"variable": "FL", "value": 0.3, "baseline": 0.2, "delta": -0.1,"year": 2024},
                {"variable": "FL", "value": 0.2, "baseline": 0.2, "delta": 0, "year": 2029},]
            },
        ]
        """
        self.result_map = config.get("result_map", [])

        self.treatment_plan_name = f"{config.get('treatment_plan_name')}-{datetime.strftime(datetime.now(), '%Y%m%d%H%M%S')}"
        self.treatment_plan = None

    def run_tests(self):
        self.create_treatment_plan()
        self.fill_prescriptions()
        self.execute_impacts()
        self.analyze_results()
        self.delete_treatment_plan()

    def create_treatment_plan(self):
        try:
            assert self.treatment_plan_name is not None

            url = reverse("api:impacts:tx-plans-list")
            data = {"name": self.treatment_plan_name, "scenario": self.scenario.id}
            response = self.client.post(url, data, format="json")
            assert response.status_code == 201

            self.treatment_plan = TreatmentPlan.objects.get(
                name=self.treatment_plan_name,
                scenario=self.scenario,
                created_by=self.user,
            )
        except AssertionError:
            log.error("E2E Impacts: Failed to create treatment plan.")
            raise
        except TreatmentPlan.DoesNotExist:
            log.error("E2E Impacts: Treatment plan not created.")
            raise

    def fill_prescriptions(self):
        if not self.treatment_plan:
            raise ValueError("Treatment plan is not created.")
        try:
            for prescription in self.prescriptions:
                action = prescription.get("action")
                project_area_id = prescription.get("project_area_id")
                stand_ids = prescription.get("stand_ids")

                tx_prescriptions_url = reverse(
                    "api:impacts:tx-prescriptions-list",
                    kwargs={"tx_plan_pk": self.treatment_plan.pk},
                )
                payload = {
                    "action": action,
                    "project_area": project_area_id,
                    "stand_ids": stand_ids,
                    "treatment_plan": self.treatment_plan.pk,
                }
                response = self.client.post(
                    tx_prescriptions_url, payload, format="json"
                )
                assert response.status_code == 201
        except AssertionError:
            log.error("E2E Impacts: Failed to fill prescriptions.")
            raise

    def execute_impacts(self):
        if not self.treatment_plan:
            raise ValueError("Treatment plan is not created.")

        try:
            url = reverse(
                "api:impacts:tx-plans-run", kwargs={"pk": self.treatment_plan.pk}
            )
            response = self.client.post(url, format="json")
            assert response.status_code == 202
        except AssertionError:
            log.error("E2E Impacts: Failed to execute impacts.")
            raise

        self.treatment_plan.refresh_from_db()
        count_down = 60
        while (
            self.treatment_plan.status
            not in (TreatmentPlanStatus.SUCCESS, TreatmentPlanStatus.FAILURE)
            and count_down > 0
        ):
            log.info(
                f"Waiting for treatment plan {self.treatment_plan.pk} to complete. Count down: {count_down}"
            )
            time.sleep(10)
            self.treatment_plan.refresh_from_db()
            count_down -= 1

        try:
            assert self.treatment_plan.status == TreatmentPlanStatus.SUCCESS
        except AssertionError:
            log.error("E2E Impacts: Failed to execute impacts.")

    def analyze_results(self):
        if not self.treatment_plan:
            raise ValueError("Treatment plan is not created.")

        for result in self.result_map:
            stand_id = result.get("stand_id")
            try:
                stand = Stand.objects.get(id=stand_id)
            except Stand.DoesNotExist:
                log.error(f"E2E Impacts: Stand not found for id {stand_id}")
                raise

            for treatment_result in result.get("treatment_results"):
                variable = treatment_result.get("variable")
                year = treatment_result.get("year")
                value = treatment_result.get("value")
                baseline = treatment_result.get("baseline")
                delta = treatment_result.get("delta")
                try:
                    treatment_result = TreatmentResult.objects.get(
                        treatment_plan=self.treatment_plan,
                        stand=stand,
                        variable=variable,
                        year=year,
                    )
                    assert treatment_result.value == value
                    assert treatment_result.baseline == baseline
                    assert treatment_result.delta == delta
                except TreatmentResult.DoesNotExist:
                    log.error(
                        f"E2E Impacts: Treatment result not found for stand {stand_id}, variable {variable}, year {year}"
                    )
                    raise
                except AssertionError:
                    log.error("E2E Impacts: Failed to analyze results.")
                    raise

    def delete_treatment_plan(self):
        try:
            if self.treatment_plan:
                url = reverse(
                    "api:impacts:tx-plans-detail", kwargs={"pk": self.treatment_plan.pk}
                )
                response = self.client.delete(url)
                assert response.status_code == 204
                self.treatment_plan.refresh_from_db()
                assert self.treatment_plan.deleted_at is not None
        except AssertionError:
            log.error("E2E Impacts: Failed to delete treatment plan.")
            raise
