import json

from typing import Any, Dict

from datasets.models import PreferredDisplayType, VisibilityOptions
from datasets.tests.factories import DatasetFactory, DataLayerFactory
from django.test import TestCase
from django.contrib.gis.geos import GEOSGeometry

from modules.base import get_module

from planning.tests.factories import PlanningAreaFactory, ScenarioFactory
from planning.models import ScenarioPlanningApproach

class MapModuleTest(TestCase):
    def test_returns_options_correctly(self):
        DatasetFactory.create(
            name="base1", preferred_display_type=PreferredDisplayType.BASE_DATALAYERS
        )
        DatasetFactory.create(
            name="main1", preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS
        )

        module = get_module("map")
        configuration: Dict[str, Any] = module.get_configuration()
        self.assertIn("name", configuration)
        self.assertIn("options", configuration)

        options: Dict[str, Any] = configuration["options"]

        self.assertIn("datasets", options)

        datasets: Dict[str, Any] = options["datasets"]

        self.assertIn("main_datasets", datasets)
        self.assertIn("base_datasets", datasets)

        main = datasets["main_datasets"]
        base = datasets["base_datasets"]

        self.assertGreaterEqual(len(main), 1)
        self.assertGreaterEqual(len(base), 1)


    def test_returns_datalayers_filtered_by_outline_geometry(self):
        geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        geos_geometry = GEOSGeometry(json.dumps(geometry))

        base1 = DatasetFactory.create(
            name="base1", preferred_display_type=PreferredDisplayType.BASE_DATALAYERS
        )
        DataLayerFactory.create(
            dataset=base1,
            outline=geos_geometry,
        )
        main1 = DatasetFactory.create(
            name="main1", preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS
        )
        DataLayerFactory.create(
            dataset=main1,
            outline=geos_geometry,
        )

        module = get_module("map")
        configuration: Dict[str, Any] = module.get_configuration(geometry=geos_geometry)
        self.assertIn("name", configuration)
        self.assertIn("options", configuration)

        options: Dict[str, Any] = configuration["options"]

        self.assertIn("datasets", options)

        datasets: Dict[str, Any] = options["datasets"]

        self.assertIn("main_datasets", datasets)
        self.assertIn("base_datasets", datasets)

        main = datasets["main_datasets"]
        base = datasets["base_datasets"]

        self.assertGreaterEqual(len(main), 1)
        self.assertGreaterEqual(len(base), 1)


    def test_returns_datalayers_filtered_by_outline_geometry__no_results(self):
        geometry = {
            "type": "MultiPolygon",
            "coordinates": [[[[1, 2], [2, 3], [3, 4], [1, 2]]]],
        }
        geos_geometry = GEOSGeometry(json.dumps(geometry))

        base1 = DatasetFactory.create(
            name="base1", preferred_display_type=PreferredDisplayType.BASE_DATALAYERS
        )
        DataLayerFactory.create(
            dataset=base1,
            outline=None,
        )
        main1 = DatasetFactory.create(
            name="main1", preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS
        )
        DataLayerFactory.create(
            dataset=main1,
            outline=None,
        )

        module = get_module("map")
        configuration: Dict[str, Any] = module.get_configuration(geometry=geos_geometry)
        self.assertIn("name", configuration)
        self.assertIn("options", configuration)

        options: Dict[str, Any] = configuration["options"]

        self.assertIn("datasets", options)

        datasets: Dict[str, Any] = options["datasets"]

        self.assertIn("main_datasets", datasets)
        self.assertIn("base_datasets", datasets)

        main = datasets["main_datasets"]
        base = datasets["base_datasets"]

        self.assertGreaterEqual(len(main), 0)
        self.assertGreaterEqual(len(base), 0)



class PrioritizeSubUnitsModuleTest(TestCase):
    def test_returns_options_correctly(self):
        base_dataset = DatasetFactory.create(
            name="base1", 
            preferred_display_type=PreferredDisplayType.BASE_DATALAYERS, 
            visibility=VisibilityOptions.PUBLIC,
            modules=["prioritize_sub_units"],
        )
        DatasetFactory.create(
            name="main1", 
            preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS, 
            visibility=VisibilityOptions.PUBLIC, 
            modules=["prioritize_sub_units"],
        )
        DataLayerFactory.create(dataset=base_dataset, metadata={"modules": {"prioritize_sub_units": {"enabled": True}}})

        module = get_module("prioritize_sub_units")
        configuration: Dict[str, Any] = module.get_configuration()
        self.assertIn("name", configuration)
        self.assertIn("options", configuration)

        options: Dict[str, Any] = configuration["options"]

        self.assertIn("datasets", options)
        self.assertIn("sub_units", options)

        datasets: Dict[str, Any] = options["datasets"]
        sub_units = options["sub_units"]

        self.assertIn("main_datasets", datasets)
        self.assertIn("base_datasets", datasets)
        

        main = datasets["main_datasets"]
        base = datasets["base_datasets"]

        self.assertEqual(len(main), 1)
        self.assertEqual(len(base), 1)
        self.assertEqual(len(sub_units), 1)


class ImpactsModulesTest(TestCase):
    def setUp(self):
        inside_california_goemtry = {
            "type": "MultiPolygon", 
            "coordinates": [ [ [ [ -121.366892199, 36.329257174 ], [ -121.361359175, 36.329425383 ], [ -121.364386679, 36.324967718 ], [ -121.366892199, 36.329257174 ] ] ] ] 
        }
        outside_california_geometry = {
            "type": "MultiPolygon",
            "coordinates": [ [ [ [ -77.906814571199931, 39.040366839373661 ], [ -77.901871799384352, 39.039805013389277 ], [ -77.905187059969236, 39.037089508161827 ], [ -77.906814571199931, 39.040366839373661 ] ] ] ] 
        }
        self.ca_planning_area = PlanningAreaFactory.create(
            geometry=GEOSGeometry(json.dumps(inside_california_goemtry))
        )
        self.non_ca_planning_area = PlanningAreaFactory.create(
            geometry=GEOSGeometry(json.dumps(outside_california_geometry))
        )

        self.ca_scenario = ScenarioFactory.create(planning_area=self.ca_planning_area)
        self.non_ca_scenario = ScenarioFactory.create(planning_area=self.non_ca_planning_area)

        return super().setUp()
    
    def test_can_run_planning_area(self):
        module = get_module("impacts")

        self.assertTrue(module.can_run(self.ca_planning_area))
        self.assertTrue(module.can_run(self.non_ca_planning_area))

    def test_can_run_scenario_based_on_geometry(self):
        module = get_module("impacts")

        self.assertTrue(module.can_run(self.ca_scenario))
        self.assertFalse(module.can_run(self.non_ca_scenario))

    def test_can_run_scenario_planning_approach(self):
        module = get_module("impacts")

        self.ca_scenario.planning_approach = ScenarioPlanningApproach.OPTIMIZE_PROJECT_AREAS
        self.ca_scenario.save()

        self.assertTrue(module.can_run(self.ca_scenario))

        self.ca_scenario.planning_approach = ScenarioPlanningApproach.PRIORITIZE_SUB_UNITS
        self.ca_scenario.save()

        self.assertFalse(module.can_run(self.ca_scenario))

