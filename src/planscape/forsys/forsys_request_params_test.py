import json

from base.condition_types import ConditionLevel
from conditions.models import BaseCondition, Condition
from django.contrib.auth.models import User
from django.contrib.gis.geos import GEOSGeometry
from django.http import QueryDict
from django.test import TestCase
from forsys.forsys_request_params import ForsysProjectAreaRankingRequestParams
from plan.models import Plan, Project, ProjectArea


class TestForsysProjectAreaRankingRequestParams(TestCase):
    def test_reads_default_url_params(self):
        qd = QueryDict('set_all_params_via_url_with_default_values=1')
        params = ForsysProjectAreaRankingRequestParams(qd)

        self.assertEqual(params.region, 'sierra_cascade_inyo')
        self.assertEqual(
            params.priorities,
            ['fire_dynamics', 'forest_resilience', 'species_diversity'])
        self.assertEqual(params.priority_weights, [1, 1, 1])

        keys = list(params.project_areas.keys())
        keys.sort()
        self.assertEqual(keys, [1, 2])

        self.assertEqual(params.project_areas[1].coords, (
            (((-120.14015536869722, 39.05413814388948),
              (-120.18409937110482, 39.48622140686506),
              (-119.93422142411087, 39.48622140686506),
              (-119.93422142411087, 39.05413814388948),
              (-120.14015536869722, 39.05413814388948)),),
            (((-120.14015536869722, 38.05413814388948),
              (-120.18409937110482, 38.48622140686506),
              (-119.93422142411087, 38.48622140686506),
              (-119.93422142411087, 38.05413814388948),
              (-120.14015536869722, 38.05413814388948)),))
        )
        self.assertEqual(params.project_areas[1].srid, 4269)
        self.assertEqual(params.project_areas[2].coords, (
            (((-121.14015536869722, 39.05413814388948),
              (-121.18409937110482, 39.48622140686506),
              (-120.53422142411087, 39.48622140686506),
              (-120.53422142411087, 39.05413814388948),
              (-121.14015536869722, 39.05413814388948)),),)
        )
        self.assertEqual(params.project_areas[2].srid, 4269)

    def test_reads_region_from_url_params(self):
        qd = QueryDict(
            'set_all_params_via_url_with_default_values=1&region=foo')
        params = ForsysProjectAreaRankingRequestParams(qd)
        self.assertEqual(params.region, 'foo')

    def test_reads_priorities_from_url_params(self):
        qd = QueryDict(
            'set_all_params_via_url_with_default_values=1' +
            '&priorities=foo&priorities=bar&priorities=baz')
        params = ForsysProjectAreaRankingRequestParams(qd)
        self.assertEqual(params.priorities, ['foo', 'bar', 'baz'])

    def test_reads_priorities_and_weights_from_url_params(self):
        qd = QueryDict(
            'set_all_params_via_url_with_default_values=1' +
            '&priorities=foo&priorities=bar&priorities=baz' +
            '&priority_weights=5.0&priority_weights=2.0&priority_weights=1.0')
        params = ForsysProjectAreaRankingRequestParams(qd)
        self.assertEqual(params.priorities, ['foo', 'bar', 'baz'])
        self.assertListEqual(params.priority_weights, [5, 2, 1])

    def test_raises_error_for_wrong_num_priority_weights_from_url_params(self):
        qd = QueryDict(
            'set_all_params_via_url_with_default_values=1' +
            '&priorities=foo&priorities=bar&priorities=baz' +
            '&priority_weights=5.0&priority_weights=2.0')
        with self.assertRaises(Exception) as context:
            ForsysProjectAreaRankingRequestParams(qd)
        self.assertEqual(
            str(context.exception),
            'expected 3 priority weights, instead, 2 were given')

    def test_reads_project_areas_from_url_params(self) -> None:
        qd = QueryDict(
            'set_all_params_via_url_with_default_values=1' +
            '&project_areas={ "id": 1, "srid": 4269, ' +
            '"polygons": [ { "coordinates": [ [-120, 40], [-120, 39], ' +
            '[-119, 39], [-120, 40] ] }, ' +
            '{ "coordinates": [ [-118, 39], [-119, 38], [-119, 39], ' +
            '[-118, 39] ] } ] }' +
            '&project_areas={ "id": 2, "srid": 4269, ' +
            '"polygons": [ { "coordinates": [ [-121, 42], [-120, 40], ' +
            '[-121, 41], [-121, 42] ] } ] }')
        params = ForsysProjectAreaRankingRequestParams(qd)

        keys = list(params.project_areas.keys())
        keys.sort()
        self.assertEqual(keys, [1, 2])

        self.assertEqual(params.project_areas[1].coords, (
            (((-120.0, 40.0),
              (-120.0, 39.0),
              (-119.0, 39.0),
              (-120.0, 40.0)),),
            (((-118.0, 39.0),
              (-119.0, 38.0),
              (-119.0, 39.0),
              (-118.0, 39.0)),))
        )
        self.assertEqual(params.project_areas[1].srid, 4269)
        self.assertEqual(params.project_areas[2].coords, (
            (((-121.0, 42.0), (-120.0, 40.0),
              (-121.0, 41.0), (-121.0, 42.0)),),)
        )
        self.assertEqual(params.project_areas[2].srid, 4269)

    def test_reads_project_areas_from_url_params_with_default_srid(
            self):
        qd = QueryDict(
            'set_all_params_via_url_with_default_values=1' +
            '&project_areas={ "id": 2, ' +
            '"polygons": [ { "coordinates": [ [-121, 42], [-120, 40], ' +
            '[-121, 41], [-121, 42] ] } ] }')
        params = ForsysProjectAreaRankingRequestParams(qd)

        keys = list(params.project_areas.keys())
        keys.sort()
        self.assertEqual(keys, [2])

        self.assertEqual(params.project_areas[2].coords, (
            (((-121.0, 42.0), (-120.0, 40.0),
              (-121.0, 41.0), (-121.0, 42.0)),),)
        )
        self.assertEqual(params.project_areas[2].srid, 4269)

    def test_raises_error_for_url_params_project_areas_w_empty_polygons(
            self):
        qd = QueryDict(
            'set_all_params_via_url_with_default_values=1' +
            '&project_areas={ "id": 1, "srid": 4269, ' +
            '"polygons": [ ] }')
        with self.assertRaises(Exception) as context:
            ForsysProjectAreaRankingRequestParams(qd)
        self.assertEqual(
            str(context.exception),
            'project area field, "polygons" is an empty list')

    def test_raises_error_for_invalid_project_areas_from_url_params(
            self):
        qd = QueryDict(
            'set_all_params_via_url_with_default_values=1' +
            '&project_areas={ "id": 1, "srid": 4269, ' +
            '"polygons": [ { "coordinates": [ [-120, 40], [-120, 39] ] } ] }')
        with self.assertRaises(Exception) as context:
            ForsysProjectAreaRankingRequestParams(qd)
        self.assertIn("LinearRing requires at least 4 points, got 2", str(
            context.exception))

    def test_raises_error_for_url_params_project_areas_missing_polygons_field(
            self):
        qd = QueryDict(
            'set_all_params_via_url_with_default_values=1' +
            '&project_areas={ "id": 1, "srid": 4269 }')
        with self.assertRaises(Exception) as context:
            ForsysProjectAreaRankingRequestParams(qd)
        self.assertEquals(
            str(context.exception),
            'project area missing field, "polygons"')

    def test_raises_error_for_url_params_project_areas_missing_id_field(
            self):
        qd = QueryDict(
            'set_all_params_via_url_with_default_values=1' +
            '&project_areas={ "srid": 4269, ' +
            '"polygons": [ { "coordinates": [ [-120, 40], [-120, 39], ' +
            '[-119, 39], [-120, 40] ] }, ' +
            '{ "coordinates": [ [-118, 39], [-119, 38], [-119, 39], ' +
            '[-118, 39] ] } ] }' +
            '&project_areas={ "id": 2, "srid": 4269, ' +
            '"polygons": [ { "coordinates": [ [-121, 42], [-120, 40], ' +
            '[-121, 41], [-121, 42] ] } ] }')
        with self.assertRaises(Exception) as context:
            ForsysProjectAreaRankingRequestParams(qd)
        self.assertEquals(
            str(context.exception), 'project area missing field, "id"')


class TestForsysProjectAreaRankingRequestParams_ReadFromDb(TestCase):
    def setUp(self) -> None:
        self.base_condition1 = BaseCondition.objects.create(
            condition_name="name1", condition_level=ConditionLevel.ELEMENT)
        self.base_condition2 = BaseCondition.objects.create(
            condition_name="name2", condition_level=ConditionLevel.ELEMENT)
        self.condition1 = Condition.objects.create(
            condition_dataset=self.base_condition1, raster_name="name1")
        self.condition2 = Condition.objects.create(
            condition_dataset=self.base_condition2, raster_name="name2")

        self.user = User.objects.create(username='testuser')
        self.user.set_password('12345')
        self.user.save()

        self.geometry = {'type': 'MultiPolygon',
                         'coordinates': [[[[1, 2], [2, 3], [3, 4], [1, 2]]]]}
        self.stored_geometry = GEOSGeometry(json.dumps(self.geometry))
        self.plan_with_user = Plan.objects.create(
            owner=self.user, name="plan", region_name='sierra_cascade_inyo',
            geometry=self.stored_geometry)

        self.project_with_user = Project.objects.create(
            owner=self.user, plan=self.plan_with_user, max_budget=100, )
        self.project_with_user.priorities.add(self.condition1)
        self.project_with_user.priorities.add(self.condition2)

        self.project_area_with_user = ProjectArea.objects.create(
            owner=self.user, project=self.project_with_user,
            project_area=self.stored_geometry, estimated_area_treated=200)

    def test_missing_project_id(self):
        qd = QueryDict('')
        self.assertRaises(Exception, ForsysProjectAreaRankingRequestParams, qd)

    def test_nonexistent_project_id(self):
        qd = QueryDict('project_id=10')
        self.assertRaises(Exception, ForsysProjectAreaRankingRequestParams, qd)

    def test_empty_project_areas(self):
        self.project_area_with_user.delete()
        qd = QueryDict('project_id=' + str(self.project_with_user.pk))
        params = ForsysProjectAreaRankingRequestParams(qd)
        self.assertEqual(params.region, 'sierra_cascade_inyo')
        self.assertEqual(len(params.project_areas), 0)

    def test_read_ok(self):
        qd = QueryDict('project_id=' + str(self.project_with_user.pk))
        params = ForsysProjectAreaRankingRequestParams(qd)
        self.assertEqual(params.region, 'sierra_cascade_inyo')
        self.assertEqual(len(params.project_areas), 1)
        self.assertTrue(
            params.project_areas[self.project_area_with_user.pk].equals(
                self.stored_geometry))
        self.assertEqual(params.priorities, ["name1", "name2"])
