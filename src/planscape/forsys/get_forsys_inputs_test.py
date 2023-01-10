from django.test import TestCase
from django.http import QueryDict
from forsys.get_forsys_inputs import ForsysScenarioSetRequestParams


class TestForsysScenarioSetRequestParams(TestCase):
    def test_reads_default_url_params(self) -> None:
        qd = QueryDict('set_all_params_via_url_params=1')
        params = ForsysScenarioSetRequestParams(qd)
        assert params.region == 'sierra_cascade_inyo'
        assert params.priorities == ['fire_dynamics',
                                     'forest_resilience', 'species_diversity']

        keys = list(params.project_areas.keys())
        keys.sort()
        assert keys == [1, 2]

        assert params.project_areas[1].coords == ((((-120.14015536869722, 39.05413814388948), (-120.18409937110482, 39.48622140686506), (-119.93422142411087, 39.48622140686506), (-119.93422142411087, 39.05413814388948), (-120.14015536869722, 39.05413814388948)),), ((
            (-120.14015536869722, 38.05413814388948), (-120.18409937110482, 38.48622140686506), (-119.93422142411087, 38.48622140686506), (-119.93422142411087, 38.05413814388948), (-120.14015536869722, 38.05413814388948)),))
        assert params.project_areas[2].coords == ((((-118.14015536869722, 39.05413814388948), (-118.18409937110482, 39.48622140686506),
                                                    (-119.53422142411087, 39.48622140686506), (-119.53422142411087, 39.05413814388948), (-118.14015536869722, 39.05413814388948)),),)


    def test_reads_region_from_url_params(self) -> None:
        qd = QueryDict('set_all_params_via_url_params=1&region=foo')
        params = ForsysScenarioSetRequestParams(qd)
        assert params.region == 'foo'


    def test_reads_priorities_from_url_params(self) -> None:
        qd = QueryDict(
            'set_all_params_via_url_params=1&priorities=foo&priorities=bar&priorities=baz')
        params = ForsysScenarioSetRequestParams(qd)
        assert params.priorities == ['foo', 'bar', 'baz']


    def test_reads_project_areas_from_url_params(self) -> None:
        qd = QueryDict(
            'set_all_params_via_url_params=1&project_areas={ "id": 1, "srid": 4269, "polygons": [ { "coordinates": [ [-120, 40], [-120, 39], [-119, 39], [-120, 40] ] }, { "coordinates": [ [-118, 39], [-119, 38], [-119, 39], [-118, 39] ] } ] }&project_areas={ "id": 2, "srid": 4269, "polygons": [ { "coordinates": [ [-121, 42], [-120, 40], [-121, 41], [-121, 42] ] } ] }')
        params = ForsysScenarioSetRequestParams(qd)

        keys = list(params.project_areas.keys())
        keys.sort()
        assert keys == [1, 2]

        assert params.project_areas[1].coords == ((((-120.0, 40.0), (-120.0, 39.0), (-119.0, 39.0), (-120.0, 40.0)),), (((-118.0, 39.0), (-119.0, 38.0), (-119.0, 39.0), (-118.0, 39.0)),))
        assert params.project_areas[2].coords == ((((-121.0, 42.0), (-120.0, 40.0), (-121.0, 41.0), (-121.0, 42.0)),),)


    def test_raises_error_for_invalid_project_areas_from_url_params(self) -> None:
        qd = QueryDict(
            'set_all_params_via_url_params=1&project_areas={ "id": 1, "srid": 4269, "polygons": [ { "coordinates": [ [-120, 40], [-120, 39] ] } ] }')
        with self.assertRaises(Exception) as context:
            ForsysScenarioSetRequestParams(qd)
        assert "LinearRing requires at least 4 points, got 2" in str(context.exception)


    def test_reads_from_db(self) -> None:
        qd = QueryDict('')
        with self.assertRaises(Exception) as context:
            ForsysScenarioSetRequestParams(qd)
        assert str(
            context.exception) == 'WIP. Please set set_all_params_via_url_params to true.'
