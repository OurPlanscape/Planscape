from io import StringIO
import json
from typing import Any, Dict

from django.contrib.auth.models import User
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon, Polygon
from django.core.management import call_command
from django.test import TestCase

from planning.models import PlanningArea, Scenario, ScenarioResult, ScenarioResultStatus


# TODO: Refactor into a test utility file.
# Create test plans.  These are going straight to the test DB without
# normal parameter checking (e.g. if is there a real geometry).
# Always use a Sierra Nevada region.
def _create_planning_area(
    user: User | None, name: str, geometry: GEOSGeometry | None
) -> PlanningArea:
    """
    Creates a planning_area with the given user, name, geometry.  All regions
    are in Sierra Nevada.
    """
    planning_area = PlanningArea.objects.create(
        user=user, name=name, region_name="sierra-nevada", geometry=geometry
    )
    planning_area.save()
    return planning_area


# Blindly create a scenario and a scenario result in its default (pending) state.
# Note that this does no deduplication, which our APIs may eventually do.
def _create_scenario(
    planning_area: PlanningArea,
    scenario_name: str,
    configuration: Dict[str, Any],
) -> Scenario:
    scenario = Scenario.objects.create(
        planning_area=planning_area, name=scenario_name, configuration=configuration
    )
    scenario.save()

    scenario_result = ScenarioResult.objects.create(scenario=scenario)
    scenario_result.save()

    return scenario


class ShouldHaveFailedException(Exception):
    """Specific new exception to be uncaught."""

    pass


class EvaluateScenarioTest(TestCase):
    def setUp(self):
        self.user = User.objects.create(username="testuser")
        self.user.set_password("12345")
        self.user.save()
        self.geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        self.storable_geometry = GEOSGeometry(json.dumps(self.geometry))
        self.planning_area = _create_planning_area(
            self.user, "test plan", self.storable_geometry
        )
        conf = {
            "weights": [],
            "est_cost": 2000,
            "max_budget": None,
            "max_slope": None,
            "min_distance_from_road": None,
            "stand_size": "LARGE",
            "excluded_areas": [],
            "stand_thresholds": [],
            "global_thresholds": [],
            "scenario_priorities": ["prio1"],
            "scenario_output_fields": ["out1"],
            "max_treatment_area_ratio": 40000,
        }
        self.scenario = _create_scenario(self.planning_area, "test scenario", conf)
        self.scenario2 = _create_scenario(self.planning_area, "test scenario2", conf)
        self.scenario3 = _create_scenario(self.planning_area, "test scenario3", conf)

        self.user2 = User.objects.create(username="testuser2")
        self.user2.set_password("12345")
        self.user2.save()
        self.planning_area2 = _create_planning_area(
            self.user2, "test plan2", self.storable_geometry
        )
        self.user2scenario = _create_scenario(
            self.planning_area2, "test user2scenario", "{}"
        )

        self.assertEqual(Scenario.objects.count(), 4)
        self.assertEqual(ScenarioResult.objects.count(), 4)

    def _call_command(self, *args, **kwargs) -> str:
        out = StringIO()
        call_command(
            "evaluate_scenario", *args, stdout=out, stderr=StringIO(), **kwargs
        )
        return out.getvalue()

    # TODO: update this when we really trigger a forsys call
    def test_evaluate_scenario(self):
        output = self._call_command(self.scenario.pk)
        scenario_result = ScenarioResult.objects.get(scenario__id=self.scenario.pk)
        self.assertEquals(scenario_result.status, ScenarioResultStatus.SUCCESS)

    def test_evaluate_scenario_dry_run(self):
        output = self._call_command(self.scenario.pk, "--dry_run")
        scenario_result = ScenarioResult.objects.get(scenario__id=self.scenario.pk)
        self.assertEquals(scenario_result.status, ScenarioResultStatus.PENDING)

    def test_evaluate_scenario_fake_run(self):
        output = self._call_command(self.scenario.pk, "--fake_run", "--fake_run_time=1")
        scenario_result = ScenarioResult.objects.get(scenario__id=self.scenario.pk)
        self.assertEquals(scenario_result.status, ScenarioResultStatus.SUCCESS)
        details = json.loads(scenario_result.run_details)
        self.assertRegex(details["comment"], r"Fire Swamp")
        self.assertTrue("start_time" in details)
        self.assertTrue("end_time" in details)
        self.assertTrue(details["elapsed_time"] > 1.0)

    def test_evaluate_scenario_fake_run_with_failure(self):
        output = self._call_command(
            self.scenario.pk,
            "--fake_run",
            "--fake_run_time=2",
            "--fake_run_failure_rate=100",
        )
        scenario_result = ScenarioResult.objects.get(scenario__id=self.scenario.pk)
        self.assertEquals(scenario_result.status, ScenarioResultStatus.FAILURE)
        details = json.loads(scenario_result.run_details)
        self.assertRegex(details["comment"], r"land war in Asia")
        self.assertTrue("start_time" in details)
        self.assertTrue("end_time" in details)
        self.assertTrue(details["elapsed_time"] > 1.0)

    def test_missing_scenario_id(self):
        try:
            output = self._call_command()
            raise ShouldHaveFailedException(output)
        except ShouldHaveFailedException as e:
            raise ShouldHaveFailedException(e)
        except Exception as e:
            self.assertRegex(
                str(e), r"the following arguments are required: scenario_id"
            )

    def test_nonexistent_scenario_id(self):
        try:
            output = self._call_command(999999)
            raise ShouldHaveFailedException(output)
        except ShouldHaveFailedException as e:
            raise ShouldHaveFailedException(e)
        except Exception as e:
            self.assertRegex(str(e), r"ScenarioResult matching query does not exist")

    def test_garbage_scenario_id(self):
        try:
            output = self._call_command("abcdef")
            raise ShouldHaveFailedException(output)
        except ShouldHaveFailedException as e:
            raise ShouldHaveFailedException(e)
        except Exception as e:
            self.assertRegex(str(e), r"argument scenario_id: invalid int value")

    def test_evaluate_scenario_ineligible_scenario_running(self):
        scenario_result = ScenarioResult.objects.get(scenario__id=self.scenario.pk)
        scenario_result.status = ScenarioResultStatus.RUNNING
        scenario_result.save()
        try:
            output = self._call_command(
                self.scenario.pk, "--fake_run", "--fake_run_time=1"
            )
            raise ShouldHaveFailedException(output)
        except ShouldHaveFailedException as e:
            raise ShouldHaveFailedException(e)
        except Exception as e:
            self.assertRegex(str(e), r"ScenarioResult matching query does not exist")

    def test_evaluate_scenario_ineligible_scenario_success(self):
        scenario_result = ScenarioResult.objects.get(scenario__id=self.scenario.pk)
        scenario_result.status = ScenarioResultStatus.SUCCESS
        scenario_result.save()
        try:
            output = self._call_command(
                self.scenario.pk, "--fake_run", "--fake_run_time=1"
            )
            raise ShouldHaveFailedException(output)
        except ShouldHaveFailedException as e:
            raise ShouldHaveFailedException(e)
        except Exception as e:
            self.assertRegex(str(e), r"ScenarioResult matching query does not exist")

    def test_evaluate_scenario_ineligible_scenario_failure(self):
        scenario_result = ScenarioResult.objects.get(scenario__id=self.scenario.pk)
        scenario_result.status = ScenarioResultStatus.FAILURE
        scenario_result.save()
        try:
            output = self._call_command(
                self.scenario.pk, "--fake_run", "--fake_run_time=1"
            )
            raise ShouldHaveFailedException(output)
        except ShouldHaveFailedException as e:
            raise ShouldHaveFailedException(e)
        except Exception as e:
            self.assertRegex(str(e), r"ScenarioResult matching query does not exist")
