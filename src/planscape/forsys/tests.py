import json
import numpy as np

from base.condition_types import ConditionLevel
from conditions.models import BaseCondition, Condition, ConditionRaster
from django.contrib.auth.models import User
from django.contrib.gis.gdal import GDALRaster
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon, Polygon
from django.db import connection
from django.http import QueryDict
from django.test import TestCase
from django.urls import reverse
from forsys.get_forsys_inputs import (ForsysInputHeaders,
                                      ForsysProjectAreaRankingInput,
                                      ForsysProjectAreaRankingRequestParams)
from plan.models import Plan, Project, ProjectArea
from planscape import settings


class ForsysProjectAreaRankingTest(TestCase):
    def setUp(self):
        self.maxDiff = None

        # Add a row for CRS 9822 to the spatial_ref_sys table, and the GeoTiff to the table.
        with connection.cursor() as cursor:
            query = ("insert into spatial_ref_sys(srid, proj4text) values(9822, '{}')").format(
                settings.CRS_9822_PROJ4)
            cursor.execute(query)

        self.region = 'sierra_cascade_inyo'

        self.xorig = -2116971
        self.yorig = 2100954
        self.xscale = 300
        self.yscale = -300

        foo_raster = self._create_raster(4, 4, (.01, .02, .03, .04,
                                                .05, .06, .07, .08,
                                                .09, .10, .11, .12,
                                                .13, .14, .15, .16))
        self.foo_condition = self._create_condition_db(
            "foo", "foo_normalized", foo_raster)
        bar_raster = self._create_raster(4, 4, (.1, .1, .1, .1,
                                                .2, .2, .2, .2,
                                                .3, .3, .3, .3,
                                                .4, .4, .4, .4))
        self.bar_condition = self._create_condition_db(
            "bar", "bar_normalized", bar_raster)

        self.user = User.objects.create(username='testuser')
        self.user.set_password('12345')
        self.user.save()

        plan_geo = self._create_geo(0, 3, 0, 3)
        self.plan = Plan.objects.create(
            owner=self.user, name="plan", region_name=self.region,
            geometry=plan_geo)

        self.project = Project.objects.create(
            owner=self.user, plan=self.plan)
        self.project.priorities.add(self.foo_condition)
        self.project.priorities.add(self.bar_condition)

        project_geo1 = self._create_geo(0, 3, 0, 1)
        self.project_area1 = ProjectArea.objects.create(
            owner=self.user, project=self.project,
            project_area=project_geo1)
        project_geo2 = self._create_geo(0, 1, 2, 3)
        self.project_area2 = ProjectArea.objects.create(
            owner=self.user, project=self.project,
            project_area=project_geo2)

    def test_project_area_ranking(self):
        response = self.client.get(
            reverse('forsys:scenario_set'), {
                'project_id': str(self.project.pk)},
            content_type='application/json')
        json_content = json.loads(response.content)
        self.assertEqual(len(json_content.keys()), 1)
        self.assertEqual(len(json_content["forsys"].keys()), 2)
        self._assert_deep_almost_equal(json_content["forsys"]["input"], {
            'proj_id': [1, 2],
            'stand_id': [1, 2],
            'area': [518400.0, 230400.0],
            'cost': [2592000000.0, 1152000000.0],
            'c_foo': [.045, .115],
            'c_bar': [.15, .35],
            'p_foo': [.955, .885],
            'p_bar': [.85, .65]
        })
        # 5^2 combinations, minus duplicate ratios (i.e. [2, 2], [3, 3],
        # [4, 4], [5, 5], [2, 4], [4, 2])
        self.assertEqual(
            len(json_content["forsys"]["output_project"].keys()), 19)
        self._assert_deep_almost_equal(
            json_content["forsys"]["output_project"]["p_foo:1 p_bar:2"],
            {'priority_weights': {'p_foo': 1, 'p_bar': 2},
             'ranked_projects':
             [{'id': 1,
               'weighted_priority_scores': {'p_foo': 0.955, 'p_bar': 1.70},
               'total_score': 2.655, 'rank': 1},
              {'id': 2,
               'weighted_priority_scores': {'p_foo': .885, 'p_bar': 1.3},
               'total_score': 2.185, 'rank': 2}],
             'cumulative_ranked_project_area': [518400.0, 748800.0],
             'cumulative_ranked_project_cost': [2592000000.0, 3744000000.0]})

    # TODO: move create geo, create_raster, and create_condition_db to a test
    # utils file.

    def _create_geo(
            self, xmin: int, xmax: int, ymin: int, ymax: int) -> MultiPolygon:
        # ST_Clip seems to include pixels up to round((coord-origin)/scale) - 1.
        buffer = 0.6

        polygon = Polygon(
            ((self.xorig + xmin*self.xscale, self.yorig + ymin*self.yscale),
             (self.xorig + xmin*self.xscale,
                self.yorig + (ymax + buffer) * self.yscale),
             (self.xorig + (xmax + buffer) * self.xscale,
                self.yorig + (ymax + buffer) * self.yscale),
             (self.xorig + (xmax + buffer) * self.xscale,
                self.yorig + ymin*self.yscale),
             (self.xorig + xmin*self.xscale, self.yorig + ymin*self.yscale)))
        geo = MultiPolygon(polygon)
        geo.srid = settings.CRS_FOR_RASTERS
        return geo

    def _create_raster(
            self, width: int, height: int, data: tuple) -> GDALRaster:
        raster = GDALRaster({
            'srid': settings.CRS_FOR_RASTERS,
            'width': width,
            'height': height,
            'scale': [self.xscale, self.yscale],
            'skew': [0, 0],
            'origin': [self.xorig, self.yorig],
            'bands': [{
                'data': data,
                'nodata_value': np.nan
            }]
        })
        return raster

    def _create_condition_db(self, condition_name: str,
                             condition_raster_name: str,
                             condition_raster: GDALRaster) -> Condition:
        base_condition = BaseCondition.objects.create(
            condition_name=condition_name, region_name=self.region,
            condition_level=ConditionLevel.METRIC)
        condition = Condition.objects.create(
            raster_name=condition_raster_name,
            condition_dataset=base_condition, is_raw=False)
        ConditionRaster.objects.create(
            name=condition_raster_name, raster=condition_raster)
        return condition

    def _assert_deep_almost_equal(self, x1, x2) -> None:
        self.assertEqual(type(x1), type(x2))
        if type(x1) is list:
            self.assertEqual(len(x1), len(x2))
            for i in range(len(x1)):
                self._assert_deep_almost_equal(x1[i], x2[i])
        elif type(x1) is dict:
            self.assertEqual(len(x1.keys()), len(x2.keys()))
            for k in x1.keys():
                self._assert_deep_almost_equal(x1[k], x2[k])
        elif type(x1) is float:
            self.assertAlmostEqual(x1, x2, places=None, delta=1e-1)
        else:
            self.assertEqual(x1, x2)