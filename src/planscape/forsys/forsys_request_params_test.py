import json

from base.condition_types import ConditionLevel
from boundary.models import Boundary, BoundaryDetails
from conditions.models import BaseCondition, Condition
from django.contrib.auth.models import User
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon, Polygon
from django.http import HttpRequest, QueryDict
from django.test import TestCase
from forsys.forsys_request_params import (
    ClusterAlgorithmType,
    ClusterAlgorithmRequestParams,
    ClusterAlgorithmRequestParams,
    get_generation_request_params,
    get_ranking_request_params,
)
from plan.models import Plan, Project, ProjectArea, Scenario, ScenarioWeightedPriority
from planscape import settings


class TestClusterAlgorithmRequestParams(TestCase):
    def test_reads_default_params(self):
        query_dict = QueryDict("")
        params = ClusterAlgorithmRequestParams(query_dict)
        self.assertEqual(params.cluster_algorithm_type, ClusterAlgorithmType.NONE)
        self.assertEqual(params.num_clusters, 500)
        self.assertEqual(params.pixel_index_weight, 0.01)

    def test_reads_cluster_algorithm_type_from_url_params(self):
        query_dict = QueryDict("cluster_algorithm_type=1")
        params = ClusterAlgorithmRequestParams(query_dict)
        self.assertEqual(
            params.cluster_algorithm_type, ClusterAlgorithmType.HIERARCHICAL_IN_PYTHON
        )

    def test_raises_error_for_bad_cluster_algorithm_type_from_url_params(self):
        query_dict = QueryDict("cluster_algorithm_type=999")
        with self.assertRaises(Exception) as context:
            ClusterAlgorithmRequestParams(query_dict)
        self.assertEqual(
            str(context.exception), "999 is not a valid ClusterAlgorithmType"
        )

    def test_reads_num_clusters_from_url_params(self):
        query_dict = QueryDict("num_clusters=1125")
        params = ClusterAlgorithmRequestParams(query_dict)
        self.assertEqual(params.num_clusters, 1125)

    def test_raises_error_for_bad_num_clusters_from_url_params(self):
        query_dict = QueryDict("num_clusters=-999")
        with self.assertRaises(Exception) as context:
            ClusterAlgorithmRequestParams(query_dict)
        self.assertEqual(str(context.exception), "expected num_clusters to be > 0")

    def test_reads_pixel_index_weight_from_url_params(self):
        query_dict = QueryDict("cluster_pixel_index_weight=0.099")
        params = ClusterAlgorithmRequestParams(query_dict)
        self.assertEqual(params.pixel_index_weight, 0.099)

    def test_raises_error_for_bad_pixel_index_weight_from_url_params(self):
        query_dict = QueryDict("cluster_pixel_index_weight=-999")
        with self.assertRaises(Exception) as context:
            ClusterAlgorithmRequestParams(query_dict)
        self.assertEqual(
            str(context.exception), "expected cluster_pixel_index_weight to be > 0"
        )


class TestForsysRankingRequestParamsFromUrlWithDefaults(TestCase):
    def test_reads_default_url_params(self):
        qd = QueryDict("request_type=1")
        params = get_ranking_request_params(qd)

        self.assertEqual(params.region, "sierra-nevada")
        self.assertEqual(
            params.priorities,
            ["fire_dynamics", "forest_resilience", "species_diversity"],
        )
        self.assertEqual(params.priority_weights, [1, 1, 1])

        keys = list(params.project_areas.keys())
        keys.sort()
        self.assertEqual(keys, [1, 2])

        self.assertIsNone(params.max_area_in_km2)
        self.assertIsNone(params.max_cost_in_usd)

        self.assertEqual(
            params.project_areas[1].coords,
            (
                (
                    (
                        (-120.14015536869722, 39.05413814388948),
                        (-120.18409937110482, 39.48622140686506),
                        (-119.93422142411087, 39.48622140686506),
                        (-119.93422142411087, 39.05413814388948),
                        (-120.14015536869722, 39.05413814388948),
                    ),
                ),
                (
                    (
                        (-120.14015536869722, 38.05413814388948),
                        (-120.18409937110482, 38.48622140686506),
                        (-119.93422142411087, 38.48622140686506),
                        (-119.93422142411087, 38.05413814388948),
                        (-120.14015536869722, 38.05413814388948),
                    ),
                ),
            ),
        )
        self.assertEqual(params.project_areas[1].srid, settings.DEFAULT_CRS)
        self.assertEqual(
            params.project_areas[2].coords,
            (
                (
                    (
                        (-121.14015536869722, 39.05413814388948),
                        (-121.18409937110482, 39.48622140686506),
                        (-120.53422142411087, 39.48622140686506),
                        (-120.53422142411087, 39.05413814388948),
                        (-121.14015536869722, 39.05413814388948),
                    ),
                ),
            ),
        )
        self.assertEqual(params.project_areas[2].srid, settings.DEFAULT_CRS)

    def test_reads_region_from_url_params(self):
        qd = QueryDict("request_type=1&region=foo")
        params = get_ranking_request_params(qd)
        self.assertEqual(params.region, "foo")

    def test_reads_priorities_from_url_params(self):
        qd = QueryDict(
            "request_type=1" + "&priorities=foo&priorities=bar&priorities=baz"
        )
        params = get_ranking_request_params(qd)
        self.assertEqual(params.priorities, ["foo", "bar", "baz"])

    def test_reads_priorities_and_weights_from_url_params(self):
        qd = QueryDict(
            "request_type=1"
            + "&priorities=foo&priorities=bar&priorities=baz"
            + "&priority_weights=5.0&priority_weights=2.0&priority_weights=1.0"
        )
        params = get_ranking_request_params(qd)
        self.assertEqual(params.priorities, ["foo", "bar", "baz"])
        self.assertListEqual(params.priority_weights, [5, 2, 1])

    def test_raises_error_for_wrong_num_priority_weights_from_url_params(self):
        qd = QueryDict(
            "request_type=1"
            + "&priorities=foo&priorities=bar&priorities=baz"
            + "&priority_weights=5.0&priority_weights=2.0"
        )
        with self.assertRaises(Exception) as context:
            get_ranking_request_params(qd)
        self.assertEqual(
            str(context.exception), "expected 3 priority weights, instead, 2 were given"
        )

    def test_reads_max_area_from_url_params(self):
        qd = QueryDict("request_type=1" + "&max_area=10000")
        params = get_ranking_request_params(qd)
        self.assertEqual(params.max_area_in_km2, 10000)

    def test_raises_error_on_bad_max_area_from_url_params(self):
        qd = QueryDict("request_type=1" + "&max_area=-10")
        with self.assertRaises(Exception) as context:
            get_ranking_request_params(qd)
        self.assertEqual(
            str(context.exception), "expected param, max_area, to have a positive value"
        )

    def test_reads_max_cost_from_url_params(self):
        qd = QueryDict("request_type=1" + "&max_cost=600")
        params = get_ranking_request_params(qd)
        self.assertEqual(params.max_cost_in_usd, 600)

    def test_raises_error_on_bad_max_cost_from_url_params(self):
        qd = QueryDict("request_type=1" + "&max_cost=0")
        with self.assertRaises(Exception) as context:
            get_ranking_request_params(qd)
        self.assertEqual(
            str(context.exception), "expected param, max_cost, to have a positive value"
        )


class TestForsysRankingRequestParamsFromDb(TestCase):
    def setUp(self) -> None:
        self.base_condition1 = BaseCondition.objects.create(
            condition_name="name1", condition_level=ConditionLevel.ELEMENT
        )
        self.base_condition2 = BaseCondition.objects.create(
            condition_name="name2", condition_level=ConditionLevel.ELEMENT
        )
        self.condition1 = Condition.objects.create(
            condition_dataset=self.base_condition1, raster_name="name1"
        )
        self.condition2 = Condition.objects.create(
            condition_dataset=self.base_condition2, raster_name="name2"
        )

        self.user = User.objects.create(username="testuser")
        self.user.set_password("12345")
        self.user.save()

        self.geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        self.stored_geometry = GEOSGeometry(json.dumps(self.geometry))
        self.plan_with_user = Plan.objects.create(
            owner=self.user,
            name="plan",
            region_name="sierra-nevada",
            geometry=self.stored_geometry,
        )

        self.project_with_user = Project.objects.create(
            owner=self.user,
            plan=self.plan_with_user,
            max_budget=100,
        )
        self.project_with_user.priorities.add(self.condition1)
        self.project_with_user.priorities.add(self.condition2)

        self.project_area_with_user = ProjectArea.objects.create(
            owner=self.user,
            project=self.project_with_user,
            project_area=self.stored_geometry,
            estimated_area_treated=200,
        )

    def test_missing_project_id(self):
        qd = QueryDict("")
        self.assertRaises(Exception, get_ranking_request_params, qd)

    def test_nonexistent_project_id(self):
        qd = QueryDict("project_id=99999")
        self.assertRaises(Exception, get_ranking_request_params, qd)

    def test_empty_project_areas(self):
        self.project_area_with_user.delete()
        qd = QueryDict("project_id=" + str(self.project_with_user.pk))
        params = get_ranking_request_params(qd)
        self.assertEqual(params.region, "sierra-nevada")
        self.assertEqual(len(params.project_areas), 0)

    def test_read_ok(self):
        qd = QueryDict("project_id=" + str(self.project_with_user.pk))
        params = get_ranking_request_params(qd)
        self.assertEqual(params.region, "sierra-nevada")
        self.assertEqual(len(params.project_areas), 1)
        self.assertTrue(
            params.project_areas[self.project_area_with_user.pk].equals(
                self.stored_geometry
            )
        )
        self.assertEqual(params.priorities, ["name1", "name2"])


class TestForsysGenerationRequestParamsFromUrlWithDefaults(TestCase):
    def test_reads_default_url_params(self):
        request = HttpRequest()
        request.GET = QueryDict("request_type=1")
        params = get_generation_request_params(request)

        self.assertEqual(params.region, "sierra-nevada")
        self.assertEqual(
            params.priorities,
            ["fire_dynamics", "forest_resilience", "species_diversity"],
        )
        self.assertEqual(params.priority_weights, [1, 1, 1])

        self.assertEqual(
            params.planning_area.coords,
            (
                (
                    (
                        (-120.14015536869722, 39.05413814388948),
                        (-120.18409937110482, 39.48622140686506),
                        (-119.93422142411087, 39.48622140686506),
                        (-119.93422142411087, 39.05413814388948),
                        (-120.14015536869722, 39.05413814388948),
                    ),
                ),
                (
                    (
                        (-120.14015536869722, 38.05413814388948),
                        (-120.18409937110482, 38.48622140686506),
                        (-119.93422142411087, 38.48622140686506),
                        (-119.93422142411087, 38.05413814388948),
                        (-120.14015536869722, 38.05413814388948),
                    ),
                ),
            ),
        )
        self.assertEqual(params.planning_area.srid, settings.DEFAULT_CRS)
        self.assertEqual(
            params.cluster_params.cluster_algorithm_type, ClusterAlgorithmType.NONE
        )
        self.assertEqual(params.cluster_params.num_clusters, 500)
        self.assertEqual(params.cluster_params.pixel_index_weight, 0.01)
        self.assertIsNone(params.db_params.scenario)
        self.assertFalse(params.db_params.write_to_db)
        self.assertIsNone(params.db_params.user)
        self.assertIsNone(params.max_cost_per_project_in_usd)
        self.assertEqual(params.max_area_per_project_in_km2, params._DEFAULT_MAX_AREA)

    def test_reads_region_from_url_params(self):
        request = HttpRequest()
        request.GET = QueryDict("request_type=1" + "&region=foo")
        params = get_generation_request_params(request)
        self.assertEqual(params.region, "foo")

    def test_reads_priorities_from_url_params(self):
        request = HttpRequest()
        request.GET = QueryDict(
            "request_type=1" + "&priorities=foo&priorities=bar&priorities=baz"
        )
        params = get_generation_request_params(request)
        self.assertEqual(params.priorities, ["foo", "bar", "baz"])

    def test_reads_priorities_and_weights_from_url_params(self):
        request = HttpRequest()
        request.GET = QueryDict(
            "request_type=1"
            + "&priorities=foo&priorities=bar&priorities=baz"
            + "&priority_weights=5.0&priority_weights=2.0&priority_weights=1.0"
        )
        params = get_generation_request_params(request)
        self.assertEqual(params.priorities, ["foo", "bar", "baz"])
        self.assertListEqual(params.priority_weights, [5, 2, 1])

    def test_raises_error_for_wrong_num_priority_weights_from_url_params(self):
        request = HttpRequest()
        request.GET = QueryDict(
            "request_type=1"
            + "&priorities=foo&priorities=bar&priorities=baz"
            + "&priority_weights=5.0&priority_weights=2.0"
        )
        with self.assertRaises(Exception) as context:
            get_generation_request_params(request)
        self.assertEqual(
            str(context.exception), "expected 3 priority weights, instead, 2 were given"
        )

    def test_reads_user_from_url_params(self):
        user = User.objects.create(username="testuser")
        user.set_password("12345")
        user.save()

        request = HttpRequest()
        request.GET = QueryDict("request_type=1" + "&debug_user_id=%d" % (user.pk))
        settings.DEBUG = True
        params = get_generation_request_params(request)
        self.assertEqual(params.db_params.user.pk, user.pk)

    def test_doesnt_read_user_from_url_params_in_prod(self):
        user = User.objects.create(username="testuser")
        user.set_password("12345")
        user.save()

        request = HttpRequest()
        request.GET = QueryDict("request_type=1" + "&debug_user_id=%d" % (user.pk))
        settings.DEBUG = False
        params = get_generation_request_params(request)
        self.assertIsNone(params.db_params.user)

    def test_fails_to_read_bad_user_from_url_params(self):
        user = User.objects.create(username="testuser")
        user.set_password("12345")
        user.save()

        request = HttpRequest()
        request.GET = QueryDict("request_type=1" + "&debug_user_id=9999")
        settings.DEBUG = True
        with self.assertRaises(Exception) as context:
            get_generation_request_params(request)
        self.assertEqual(str(context.exception), "User matching query does not exist.")

    def test_reads_per_project_constraints_from_url_params(self):
        request = HttpRequest()
        request.GET = QueryDict(
            "request_type=1" + "&max_area_per_project=100&max_cost_per_project=5000"
        )
        params = get_generation_request_params(request)
        self.assertEqual(params.max_area_per_project_in_km2, 100)
        self.assertEqual(params.max_cost_per_project_in_usd, 5000)

    def test_raises_error_on_bad_max_cost_per_project_from_url_params(self):
        request = HttpRequest()
        request.GET = QueryDict("request_type=1" + "&max_cost_per_project=0")
        with self.assertRaises(Exception) as context:
            get_generation_request_params(request)
        self.assertEqual(
            str(context.exception),
            "expected param, max_cost_per_project, to have a positive value",
        )

    def test_raises_error_on_bad_max_area_per_project_from_url_params(self):
        request = HttpRequest()
        request.GET = QueryDict("request_type=1" + "&max_area_per_project=0")
        with self.assertRaises(Exception) as context:
            get_generation_request_params(request)
        self.assertEqual(
            str(context.exception),
            "expected param, max_area_per_project, to have a positive value",
        )


class TestForsysGenerationRequestParamsFromDb(TestCase):
    def setUp(self) -> None:
        self.region = "sierra-nevada"

        self.user = User.objects.create(username="testuser")
        self.user.set_password("12345")
        self.user.save()

        self.geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        self.stored_geometry = GEOSGeometry(json.dumps(self.geometry))

        self.plan_with_user = Plan.objects.create(
            owner=self.user,
            name="plan",
            region_name=self.region,
            geometry=self.stored_geometry,
        )

        self.project_with_user = Project.objects.create(
            owner=self.user,
            plan=self.plan_with_user,
            max_cost_per_project_in_usd=1000,
            max_area_per_project_in_km2=500,
        )

        self.scenario_with_user = Scenario.objects.create(
            owner=self.user,
            plan=self.plan_with_user,
            project=self.project_with_user,
            status=Scenario.ScenarioStatus.INITIALIZED,
        )

        weighted_priorities = {"foo": 1, "bar": 5, "baz": 3}
        for condition_name in weighted_priorities.keys():
            base_condition = BaseCondition.objects.create(
                condition_name=condition_name,
                region_name=self.region,
                condition_level=1,
            )
            condition = Condition.objects.create(condition_dataset=base_condition)
            ScenarioWeightedPriority.objects.create(
                scenario=self.scenario_with_user,
                priority=condition,
                weight=weighted_priorities[condition_name],
            )

    def test_read_ok(self):
        request = HttpRequest()
        request.GET = QueryDict("scenario_id=" + str(self.scenario_with_user.pk))
        request.user = self.user

        params = get_generation_request_params(request)
        self.assertEqual(params.region, "sierra-nevada")
        self.assertEqual(
            params.planning_area.coords,
            ((((1.0, 2.0), (2.0, 3.0), (3.0, 4.0), (1.0, 2.0)),),),
        )
        self.assertListEqual(params.priorities, ["foo", "bar", "baz"])
        self.assertListEqual(params.priority_weights, [1, 5, 3])

        self.assertEqual(
            params.cluster_params.cluster_algorithm_type, ClusterAlgorithmType.NONE
        )
        self.assertEqual(params.cluster_params.num_clusters, 500)
        self.assertEqual(params.cluster_params.pixel_index_weight, 0.01)

        self.assertTrue(params.db_params.write_to_db)
        self.assertEqual(params.db_params.scenario.pk, self.scenario_with_user.pk)
        self.assertEqual(params.db_params.user.pk, self.user.pk)
        self.assertEqual(params.max_cost_per_project_in_usd, 1000)
        self.assertEqual(params.max_area_per_project_in_km2, 500)

    def test_read_ok_for_debug_user(self):
        request = HttpRequest()
        request.GET = QueryDict(
            "scenario_id="
            + str(self.scenario_with_user.pk)
            + "&debug_user_id="
            + str(self.user.pk)
        )
        settings.DEBUG = True

        params = get_generation_request_params(request)
        self.assertEqual(params.region, "sierra-nevada")
        self.assertEqual(
            params.planning_area.coords,
            ((((1.0, 2.0), (2.0, 3.0), (3.0, 4.0), (1.0, 2.0)),),),
        )
        self.assertListEqual(params.priorities, ["foo", "bar", "baz"])
        self.assertListEqual(params.priority_weights, [1, 5, 3])

        self.assertEqual(
            params.cluster_params.cluster_algorithm_type, ClusterAlgorithmType.NONE
        )
        self.assertEqual(params.cluster_params.num_clusters, 500)
        self.assertEqual(params.cluster_params.pixel_index_weight, 0.01)

        self.assertTrue(params.db_params.write_to_db)
        self.assertEqual(params.db_params.scenario.pk, self.scenario_with_user.pk)
        self.assertEqual(params.db_params.user.pk, self.user.pk)

    def test_fails_for_debug_user_in_prod(self):
        request = HttpRequest()
        request.GET = QueryDict(
            "scenario_id="
            + str(self.scenario_with_user.pk)
            + "&debug_user_id="
            + str(self.user.pk)
        )
        settings.DEBUG = False

        with self.assertRaises(Exception) as context:
            get_generation_request_params(request)
        self.assertEquals(
            str(context.exception), "You do not have permission to view this scenario."
        )

    def test_fails_for_bad_debug_user(self):
        request = HttpRequest()
        request.GET = QueryDict(
            "scenario_id=" + str(self.scenario_with_user.pk) + "&debug_user_id=9999"
        )
        settings.DEBUG = True

        with self.assertRaises(Exception) as context:
            get_generation_request_params(request)
        self.assertEquals(str(context.exception), "User matching query does not exist.")

    def test_fails_on_no_user(self):
        request = HttpRequest()
        request.GET = QueryDict("scenario_id=" + str(self.scenario_with_user.pk))
        with self.assertRaises(Exception) as context:
            get_generation_request_params(request)
        self.assertEquals(
            str(context.exception), "You do not have permission to view this scenario."
        )

    def test_fails_on_wrong_user(self):
        wrong_user = User.objects.create(username="wrong_user")
        wrong_user.set_password("12345")
        wrong_user.save()

        request = HttpRequest()
        request.GET = request.GET = QueryDict(
            "scenario_id=" + str(self.scenario_with_user.pk)
        )
        request.user = wrong_user
        with self.assertRaises(Exception) as context:
            get_generation_request_params(request)
        self.assertEquals(
            str(context.exception), "You do not have permission to view this scenario."
        )

    def test_fails_no_scenario(self):
        request = HttpRequest()
        request.GET = QueryDict()
        request.user = self.user
        with self.assertRaises(Exception) as context:
            get_generation_request_params(request)
        self.assertEquals(str(context.exception), "'scenario_id'")

    def test_fails_nonexistent_scenario_id(self):
        request = HttpRequest()
        request.GET = QueryDict("scenario_id=" + str(125125))
        request.user = self.user
        with self.assertRaises(Exception) as context:
            get_generation_request_params(request)
        self.assertEquals(
            str(context.exception), "Scenario matching query does not exist."
        )

    def test_fails_scenario_status(self):
        self.scenario_with_user.status = Scenario.ScenarioStatus.PENDING
        self.scenario_with_user.save()

        request = HttpRequest()
        request.GET = QueryDict("scenario_id=" + str(self.scenario_with_user.pk))
        request.user = self.user

        with self.assertRaises(Exception) as context:
            get_generation_request_params(request)
        self.assertRegex(
            str(context.exception),
            "scenario status for scenario ID, [0-9]+, "
            + "is Pending \(expected Initialized or Failed\)",
        )

    def test_fails_zero_weighted_priorities(self):
        ScenarioWeightedPriority.objects.all().delete()

        request = HttpRequest()
        request.GET = QueryDict("scenario_id=" + str(self.scenario_with_user.pk))
        request.user = self.user

        with self.assertRaises(Exception) as context:
            get_generation_request_params(request)
        self.assertRegex(
            str(context.exception),
            "no weighted priorities available for scenario ID, [0-9]+",
        )


class ForsysGenerationRequestParamsFromHuc12(TestCase):
    def setUp(self) -> None:
        huc12_id = Boundary.objects.create(boundary_name="huc12", id=43).pk
        BoundaryDetails.objects.create(
            boundary_id=huc12_id,
            shape_name="Little Silver Creek-Silver Creek",
            geometry=self._create_polygon(-120, 40, -121, 41),
        )
        BoundaryDetails.objects.create(
            boundary_id=huc12_id,
            shape_name="Slab Creek",
            geometry=self._create_polygon(-121, 40, -122, 41),
        )

    def test_returns_default(self):
        request = HttpRequest()
        request.GET = QueryDict("request_type=2")
        params = get_generation_request_params(request)

        self.assertEqual(params.region, "sierra-nevada")
        self.assertEqual(
            params.priorities,
            [
                "california_spotted_owl",
                "storage",
                "functional_fire",
                "forest_structure",
                "max_sdi",
            ],
        )
        self.assertEqual(params.priority_weights, [1, 1, 1, 1, 1])

        self.assertEqual(
            params.planning_area.coords,
            (
                (
                    (-120.0, 40.0),
                    (-120.0, 41.0),
                    (-121.0, 41.0),
                    (-121.0, 40.0),
                    (-120.0, 40.0),
                ),
            ),
        )
        self.assertEqual(params.planning_area.srid, settings.DEFAULT_CRS)

    def test_reads_region_from_url_params(self):
        request = HttpRequest()
        request.GET = QueryDict("request_type=2" + "&region=foo")
        params = get_generation_request_params(request)
        self.assertEqual(params.region, "foo")

    def test_reads_priorities_from_url_params(self):
        request = HttpRequest()
        request.GET = QueryDict(
            "request_type=2" + "&priorities=foo&priorities=bar&priorities=baz"
        )
        params = get_generation_request_params(request)
        self.assertEqual(params.priorities, ["foo", "bar", "baz"])

    def test_reads_priorities_and_weights_from_url_params(self):
        request = HttpRequest()
        request.GET = QueryDict(
            "request_type=2"
            + "&priorities=foo&priorities=bar&priorities=baz"
            + "&priority_weights=5.0&priority_weights=2.0&priority_weights=1.0"
        )
        params = get_generation_request_params(request)
        self.assertEqual(params.priorities, ["foo", "bar", "baz"])
        self.assertListEqual(params.priority_weights, [5, 2, 1])

    def test_raises_error_for_wrong_num_priority_weights_from_url_params(self):
        request = HttpRequest()
        request.GET = QueryDict(
            "request_type=2"
            + "&priorities=foo&priorities=bar&priorities=baz"
            + "&priority_weights=5.0&priority_weights=2.0"
        )
        with self.assertRaises(Exception) as context:
            get_generation_request_params(request)
        self.assertEqual(
            str(context.exception), "expected 3 priority weights, instead, 2 were given"
        )

    def test_merges_conditions(self):
        request = HttpRequest()
        request.GET = QueryDict(
            "request_type=2"
            + "&huc12_names=Little Silver Creek-Silver Creek"
            + "&huc12_names=Slab Creek"
        )
        params = get_generation_request_params(request)
        self.assertEqual(
            params.planning_area.coords,
            (
                (
                    (-120.0, 41.0),
                    (-120.0, 40.0),
                    (-122.0, 40.0),
                    (-122.0, 41.0),
                    (-120.0, 41.0),
                ),
            ),
        )
        self.assertEqual(params.planning_area.srid, settings.DEFAULT_CRS)

    def _create_polygon(self, xmin, ymin, xmax, ymax) -> MultiPolygon:
        polygon = Polygon(
            ((xmin, ymin), (xmin, ymax), (xmax, ymax), (xmax, ymin), (xmin, ymin))
        )
        geo = MultiPolygon(polygon)
        geo.srid = settings.DEFAULT_CRS
        return geo
