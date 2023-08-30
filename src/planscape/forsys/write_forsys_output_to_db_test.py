from django.contrib.auth.models import User
from forsys.forsys_request_params import (
    ForsysGenerationRequestParams, DbRequestParams)
from forsys.write_forsys_output_to_db import (
    create_plan_and_scenario, save_generation_output_to_db)
from conditions.models import BaseCondition, Condition
from plan.models import ScenarioWeightedPriority, RankedProjectArea, Scenario
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.http import HttpRequest
from planscape import settings
from django.test import TestCase


def _create_condition(name: str, region: str):
    base_condition = BaseCondition.objects.create(
        condition_name=name, region_name=region, condition_level=3)
    Condition.objects.create(condition_dataset=base_condition,
                             condition_score_type=0, is_raw=False)


def _set_up_db(self):
    self.region = 'sierra-nevada'

    poly = Polygon(((-120.14015536869722, 39.05413814388948),
                    (-120.18409937110482, 39.48622140686506),
                    (-119.93422142411087, 39.48622140686506),
                    (-119.93422142411087, 39.05413814388948),
                    (-120.14015536869722, 39.05413814388948)))
    self.geo = MultiPolygon((poly))
    self.geo.srid = settings.DEFAULT_CRS

    self.user = User.objects.create(username='testuser')
    self.user.set_password('12345')
    self.user.save()

    _create_condition('foo', self.region)
    _create_condition('bar', self.region)


class CreatePlanAndScenarioTest(TestCase):
    def setUp(self):
        _set_up_db(self)

    def test_creates_plan_and_scenario(self):
        params = ForsysGenerationRequestParams()
        params.region = self.region
        params.priorities = ['foo', 'bar']
        params.priority_weights = [1, 4]
        params.planning_area = self.geo

        req = HttpRequest()
        params.db_params = DbRequestParams(req)
        params.db_params.user = self.user
        params.db_params.write_to_db = True

        scenario = create_plan_and_scenario(params)
        project = scenario.project
        plan = scenario.plan

        self.assertEqual(scenario.owner, params.db_params.user)

        self.assertEqual(plan.owner, params.db_params.user)
        self.assertEqual(plan.region_name, params.region)
        self.assertEqual(plan.geometry, params.planning_area)

        self.assertEqual(project.owner, params.db_params.user)
        self.assertEqual(project.plan, plan)

        weighted_priorities = {
            wp.priority.condition_dataset.condition_name: wp.weight
            for wp in ScenarioWeightedPriority.objects.filter(
                scenario_id=scenario.pk)}
        self.assertDictEqual(weighted_priorities, {'foo': 1, 'bar': 4})


class SaveGenerationOutputToDbTest(TestCase):
    def setUp(self):
        _set_up_db(self)

        params = ForsysGenerationRequestParams()
        params.region = self.region
        params.priorities = ['foo', 'bar']
        params.priority_weights = [1, 4]
        params.planning_area = self.geo

        req = HttpRequest()
        params.db_params = DbRequestParams(req)
        params.db_params.user = self.user
        params.db_params.write_to_db = True
        self.scenario = create_plan_and_scenario(params)

    def test_saves_generation_output_to_db(self):
        poly1 = Polygon(((-120.14015536869722, 39.05413814388948),
                      (-119.93422142411087, 39.48622140686506),
                      (-119.93422142411087, 39.05413814388948),
                      (-120.14015536869722, 39.05413814388948)))
        poly1.srid = settings.DEFAULT_CRS
        poly2 = Polygon(((-120.14015536869722, 39.05413814388948),
                      (-120.18409937110482, 39.48622140686506),
                      (-119.93422142411087, 39.05413814388948),
                      (-120.14015536869722, 39.05413814388948)))
        poly2.srid = settings.DEFAULT_CRS

        save_generation_output_to_db(
            self.scenario, {
                'ranked_projects':
                [{'id': 2,
                  'weighted_priority_scores': {'foo': 0.1, 'bar': 0.8},
                  'total_score': 0.9,
                  'rank': 1,
                  'geo_wkt': poly1.wkt},
                 {'id': 1,
                  'weighted_priority_scores': {'foo': 0.5, 'bar': 0.2},
                    'total_score': 0.7,
                    'rank': 2,
                    'geo_wkt': poly2.wkt}]})

        p1 = RankedProjectArea.objects.get(
            scenario_id=self.scenario.pk, rank=1)
        self.assertAlmostEqual(p1.weighted_score, 0.9)
        self.assertEqual(p1.project_area.project_area.coords[0], poly1.coords)
        self.assertEqual(p1.project_area.owner, self.user)
        self.assertEqual(p1.project_area.project, self.scenario.project)

        p2 = RankedProjectArea.objects.get(
            scenario_id=self.scenario.pk, rank=2)
        self.assertAlmostEqual(p2.weighted_score, 0.7)
        self.assertEqual(p2.project_area.project_area.coords[0], poly2.coords)
        self.assertEqual(p2.project_area.owner, self.user)
        self.assertEqual(p2.project_area.project, self.scenario.project)

        self.assertEqual(self.scenario.status, Scenario.ScenarioStatus.SUCCESS)
