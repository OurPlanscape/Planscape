import json

from typing import Any, Dict

from datasets.models import DataLayerType, PreferredDisplayType, VisibilityOptions
from datasets.tests.factories import DatasetFactory, DataLayerFactory
from django.conf import settings
from django.test import TestCase
from django.contrib.gis.geos import GEOSGeometry

from funding_report.models import FundingReportLayerCategory, FundingReportMetric

from modules.base import get_module
from modules.serializers import FundingReportModuleSerializer

from planscape.tests.factories import UserFactory
from planning.tests.factories import PlanningAreaFactory, ScenarioFactory
from planning.models import ScenarioPlanningApproach


class ForsysModuleTest(TestCase):
    def setUp(self):
        self.planning_area = PlanningAreaFactory.create()
        return super().setUp()

    def test_can_run_planning_area(self):
        module = get_module("forsys")
        self.assertTrue(module.can_run(self.planning_area))

    def test_can_run_scenario_with_stand_size(self):
        scenario = ScenarioFactory.create(
            planning_area=self.planning_area,
            configuration={"stand_size": "LARGE"},
        )
        module = get_module("forsys")
        self.assertTrue(module.can_run(scenario))

    def test_cannot_run_scenario_without_stand_size(self):
        scenario = ScenarioFactory.create(
            planning_area=self.planning_area,
            configuration={},
        )
        module = get_module("forsys")
        self.assertFalse(module.can_run(scenario))

    def test_cannot_run_scenario_with_empty_configuration(self):
        scenario = ScenarioFactory.build(
            planning_area=self.planning_area,
            configuration=None,
        )
        module = get_module("forsys")
        self.assertFalse(module.can_run(scenario))

class MapModuleTest(TestCase):
    def test_returns_options_correctly(self):
        DatasetFactory.create(
            name="base1", 
            visibility=VisibilityOptions.PUBLIC,
            preferred_display_type=PreferredDisplayType.BASE_DATALAYERS
        )
        DatasetFactory.create(
            name="main1", 
            visibility=VisibilityOptions.PUBLIC,
            preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS
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
            name="base1", 
            visibility=VisibilityOptions.PUBLIC,
            preferred_display_type=PreferredDisplayType.BASE_DATALAYERS,
        )
        DataLayerFactory.create(
            dataset=base1,
            outline=geos_geometry,
        )
        main1 = DatasetFactory.create(
            name="main1", 
            visibility=VisibilityOptions.PUBLIC,
            preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS
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
            name="base1", 
            visibility=VisibilityOptions.PUBLIC,
            preferred_display_type=PreferredDisplayType.BASE_DATALAYERS
        )
        DataLayerFactory.create(
            dataset=base1,
            outline=None,
        )
        main1 = DatasetFactory.create(
            name="main1", 
            visibility=VisibilityOptions.PUBLIC,
            preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS
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


    def test_returns_private_dataset_for_staff_users(self):
        DatasetFactory.create(
            name="base-private", 
            visibility=VisibilityOptions.PRIVATE,
            preferred_display_type=PreferredDisplayType.BASE_DATALAYERS
        )
        DatasetFactory.create(
            name="base-public", 
            visibility=VisibilityOptions.PUBLIC,
            preferred_display_type=PreferredDisplayType.BASE_DATALAYERS
        )
        DatasetFactory.create(
            name="main-private", 
            visibility=VisibilityOptions.PRIVATE,
            preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS
        )
        DatasetFactory.create(
            name="main-public", 
            visibility=VisibilityOptions.PUBLIC,
            preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS
        )
        staff_user = UserFactory.create(is_staff=True)
        standard_user = UserFactory.create(is_staff=False)

        module = get_module("map")

        # staff user
        configuration: Dict[str, Any] = module.get_configuration(user=staff_user)
        self.assertIn("name", configuration)
        self.assertIn("options", configuration)

        options: Dict[str, Any] = configuration["options"]

        self.assertIn("datasets", options)

        datasets: Dict[str, Any] = options["datasets"]

        self.assertIn("main_datasets", datasets)
        self.assertIn("base_datasets", datasets)

        main = datasets["main_datasets"]
        base = datasets["base_datasets"]

        self.assertGreaterEqual(len(main), 2)
        self.assertGreaterEqual(len(base), 2)

        # standard user
        configuration: Dict[str, Any] = module.get_configuration(user=standard_user)
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


    def test_returns_private_dataset_for_staff_users(self):
        private_base_dataset = DatasetFactory.create(
            name="base-private",
            preferred_display_type=PreferredDisplayType.BASE_DATALAYERS, 
            visibility=VisibilityOptions.PRIVATE,
            modules=["prioritize_sub_units"],
        )
        public_base_dataset = DatasetFactory.create(
            name="base-public",
            preferred_display_type=PreferredDisplayType.BASE_DATALAYERS, 
            visibility=VisibilityOptions.PUBLIC,
            modules=["prioritize_sub_units"],
        )
        DatasetFactory.create(
            name="main-private", 
            preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS, 
            visibility=VisibilityOptions.PRIVATE, 
            modules=["prioritize_sub_units"],
        )
        DatasetFactory.create(
            name="main-public", 
            preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS, 
            visibility=VisibilityOptions.PUBLIC, 
            modules=["prioritize_sub_units"],
        )
        DataLayerFactory.create(dataset=private_base_dataset, metadata={"modules": {"prioritize_sub_units": {"enabled": True}}})
        DataLayerFactory.create(dataset=public_base_dataset, metadata={"modules": {"prioritize_sub_units": {"enabled": True}}})

        staff_user = UserFactory.create(is_staff=True)
        standard_user = UserFactory.create(is_staff=False)

        module = get_module("prioritize_sub_units")

        # staff user
        configuration: Dict[str, Any] = module.get_configuration(user=staff_user)
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

        self.assertEqual(len(main), 2)
        self.assertEqual(len(base), 2)
        self.assertEqual(len(sub_units), 2)

        # standard user
        configuration: Dict[str, Any] = module.get_configuration(user=standard_user)
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


class FundingReportModuleTest(TestCase):
    def create_funding_report_datalayer(self, metric, year, baseline):
        return DataLayerFactory.create(
            type=DataLayerType.RASTER,
            metadata={
                "modules": {
                    "funding_report": {
                        "year": year,
                        "variable": metric.value,
                        "baseline": baseline,
                    }
                }
            },
        )

    def create_aet_datalayer(self, role):
        return DataLayerFactory.create(
            type=DataLayerType.RASTER,
            metadata={
                "modules": {"funding_report": {"variable": "AET", "role": role}}
            },
        )

    def test_returns_options_with_layers_of_interest(self):
        aboveground = self.create_funding_report_datalayer(
            FundingReportMetric.ABOVEGROUND_TOTAL, 2026, True
        )
        smoke = self.create_funding_report_datalayer(
            FundingReportMetric.POTENTIAL_SMOKE, 2026, True
        )
        flame = self.create_funding_report_datalayer(
            FundingReportMetric.TOTAL_FLAME_SEVERITY, 2026, True
        )
        aet_baseline = self.create_aet_datalayer("baseline")
        aet_target = self.create_aet_datalayer("target")

        mills_dataset = DatasetFactory.create(name=settings.FORISK_MILLS_DATASET_NAME)
        mill_layer = DataLayerFactory.create(dataset=mills_dataset)

        module = get_module("funding_report")
        configuration: Dict[str, Any] = module.get_configuration()

        self.assertIn("options", configuration)
        options: Dict[str, Any] = configuration["options"]
        self.assertIn("datalayers", options)

        datalayers: Dict[str, Any] = options["datalayers"]

        self.assertCountEqual(
            datalayers[FundingReportLayerCategory.CARBON],
            [aboveground, smoke],
        )
        self.assertEqual(
            datalayers[FundingReportLayerCategory.WILDFIRE_RISK_REDUCTION], [flame]
        )
        self.assertCountEqual(
            datalayers[FundingReportLayerCategory.WATER], [aet_baseline, aet_target]
        )
        self.assertEqual(
            datalayers[FundingReportLayerCategory.BIOMASS],
            [mill_layer],
        )

    def test_datalayers_option_serializes_correctly(self):
        aboveground = self.create_funding_report_datalayer(
            FundingReportMetric.ABOVEGROUND_TOTAL, 2026, True
        )
        mills_dataset = DatasetFactory.create(name=settings.FORISK_MILLS_DATASET_NAME)
        mill_layer = DataLayerFactory.create(dataset=mills_dataset)

        module = get_module("funding_report")
        configuration = module.get_configuration()
        data = FundingReportModuleSerializer(instance=configuration).data

        serialized_datalayers = data["options"]["datalayers"]
        self.assertEqual(
            serialized_datalayers[FundingReportLayerCategory.CARBON][0]["id"],
            aboveground.id,
        )
        self.assertEqual(
            serialized_datalayers[FundingReportLayerCategory.WILDFIRE_RISK_REDUCTION],
            [],
        )
        self.assertEqual(
            serialized_datalayers[FundingReportLayerCategory.BIOMASS][0]["id"],
            mill_layer.id,
        )

