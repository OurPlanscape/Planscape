import json

import numpy as np
from base.condition_types import ConditionLevel
from conditions.models import BaseCondition, Condition
from conditions.raster_condition_retrieval_testcase import \
    RasterConditionRetrievalTestCase
from django.contrib.auth.models import User
from django.contrib.gis.geos import GEOSGeometry
from django.http import QueryDict
from django.test import TestCase
from forsys.get_forsys_inputs import (ForsysInputHeaders,
                                      ForsysProjectAreaRankingInput,
                                      ForsysProjectAreaRankingRequestParams)
from plan.models import Plan, Project, ProjectArea


class TestForsysProjectAreaRankingRequestParams(TestCase):
    def test_reads_default_url_params(self):
        qd = QueryDict('set_all_params_via_url_with_default_values=1')
        params = ForsysProjectAreaRankingRequestParams(qd)

        self.assertEqual(params.region, 'sierra_cascade_inyo')
        self.assertEqual(
            params.priorities,
            ['fire_dynamics', 'forest_resilience', 'species_diversity'])

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


class ForsysInputHeadersTest(TestCase):
    def test_sets_priority_headers(self):
        headers = ForsysInputHeaders(["p1", "p2", "p3"])
        self.assertListEqual(headers.priority_headers,
                             ["p_p1", "p_p2", "p_p3"])

    def test_priority(self):
        headers = ForsysInputHeaders([])
        self.assertEqual(headers.get_priority_header("priority"), "p_priority")

    def test_condition(self):
        headers = ForsysInputHeaders([])
        self.assertEqual(
            headers.get_condition_header("condition"),
            "c_condition")


class ForsysProjectAreaRankingInputTest(RasterConditionRetrievalTestCase):
    def setUp(self) -> None:
        RasterConditionRetrievalTestCase.setUp(self)

        foo_raster = RasterConditionRetrievalTestCase._create_raster(
            self, 4, 4, (.01, .02, .03, .04,
                         .05, .06, .07, .08,
                         .09, .10, .11, .12,
                         .13, .14, .15, .16))
        RasterConditionRetrievalTestCase._save_condition_to_db(
            self, "foo", "foo_normalized", foo_raster)
        bar_raster = RasterConditionRetrievalTestCase._create_raster(
            self, 4, 4, (.1, .1, .1, .1,
                         .2, .2, .2, .2,
                         .3, .3, .3, .3,
                         .4, .4, .4, .4))
        RasterConditionRetrievalTestCase._save_condition_to_db(
            self, "bar", "bar_normalized", bar_raster)

    def test_gets_forsys_input(self):
        qd = QueryDict('set_all_params_via_url_with_default_values=1')
        params = ForsysProjectAreaRankingRequestParams(qd)
        params.region = self.region
        params.priorities = ["foo", "bar"]
        params.project_areas.clear()
        params.project_areas[1] = RasterConditionRetrievalTestCase._create_geo(
            self, 0, 3, 0, 1)
        params.project_areas[2] = RasterConditionRetrievalTestCase._create_geo(
            self, 0, 1, 2, 3)

        headers = ForsysInputHeaders(params.priorities)

        input = ForsysProjectAreaRankingInput(params, headers)
        self._assert_dict_almost_equal(input.forsys_input, {
            'proj_id': [1, 2],
            'stand_id': [1, 2],
            'area': [720000, 360000],
            'cost': [3600000000.0, 1800000000.0],
            'p_foo': [7.64, 3.54],
            'p_bar': [6.8, 2.6]
        })

    def test_missing_base_condition(self):
        qd = QueryDict('set_all_params_via_url_with_default_values=1')
        params = ForsysProjectAreaRankingRequestParams(qd)
        params.region = self.region
        # No base conditions exist for baz.
        params.priorities = ["foo", "bar", "baz"]
        params.project_areas.clear()
        params.project_areas[1] = RasterConditionRetrievalTestCase._create_geo(
            self, 0, 3, 0, 1)

        headers = ForsysInputHeaders(params.priorities)

        with self.assertRaises(Exception) as context:
            ForsysProjectAreaRankingInput(params, headers)
        self.assertEqual(
            str(context.exception),
            "of 3 priorities, only 2 had base conditions")

    def test_missing_condition(self):
        # A base condition exists for baz, but a condition dosen't.
        BaseCondition.objects.create(
            condition_name="baz", region_name=self.region,
            condition_level=ConditionLevel.METRIC)

        qd = QueryDict('set_all_params_via_url_with_default_values=1')
        params = ForsysProjectAreaRankingRequestParams(qd)
        params.region = self.region
        params.priorities = ["foo", "bar", "baz"]
        params.project_areas.clear()
        params.project_areas[1] = RasterConditionRetrievalTestCase._create_geo(
            self, 0, 3, 0, 1)

        headers = ForsysInputHeaders(params.priorities)

        with self.assertRaises(Exception) as context:
            ForsysProjectAreaRankingInput(params, headers)
        self.assertEqual(
            str(context.exception),
            "of 3 priorities, only 2 had conditions")

    def test_missing_condition_score(self):
        qd = QueryDict('set_all_params_via_url_with_default_values=1')
        params = ForsysProjectAreaRankingRequestParams(qd)
        params.region = self.region
        params.priorities = ["foo"]
        params.project_areas.clear()
        # project area doesn't interseect with the raster for "foo".
        params.project_areas[1] = RasterConditionRetrievalTestCase._create_geo(
            self, 5, 6, 0, 1)

        headers = ForsysInputHeaders(params.priorities)

        with self.assertRaises(Exception) as context:
            ForsysProjectAreaRankingInput(params, headers)
        self.assertEqual(
            str(context.exception),
            "no score was retrieved for condition, foo")

    def _assert_dict_almost_equal(self,
                                  d1: dict[str, list],
                                  d2: dict[str, list]) -> None:
        for k in d1.keys():
            l1 = d1[k]
            if len(l1) > 0 and type(l1[0]) is float:
                np.testing.assert_array_almost_equal(l1, d2[k])
            else:
                self.assertListEqual(l1, d2[k])
