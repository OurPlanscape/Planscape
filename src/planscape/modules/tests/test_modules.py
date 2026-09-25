import json

from typing import Any, Dict

from datasets.models import (
    DataLayerStatus,
    DataLayerType,
    PreferredDisplayType,
    VisibilityOptions,
)
from datasets.tests.factories import DatasetFactory, DataLayerFactory
from django.conf import settings
from django.test import TestCase
from django.contrib.gis.geos import GEOSGeometry

from funding_report.models import FundingReportLayerCategory, FundingReportMetric

from modules.base import (
    compute_planning_area_capabilities,
    compute_scenario_capabilities,
    get_module,
)
from modules.serializers import (
    AdvancedStandLevelConstraintSerializer,
    FundingReportModuleSerializer,
)

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
        DataLayerFactory.create(
            dataset=base_dataset,
            type=DataLayerType.VECTOR,
            metadata={"modules": {"prioritize_sub_units": {"enabled": True}}},
        )

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

    def test_excludes_raster_layers(self):
        base_dataset = DatasetFactory.create(
            name="base1",
            preferred_display_type=PreferredDisplayType.BASE_DATALAYERS,
            visibility=VisibilityOptions.PUBLIC,
            modules=["prioritize_sub_units"],
        )
        DataLayerFactory.create(
            dataset=base_dataset,
            type=DataLayerType.VECTOR,
            metadata={"modules": {"prioritize_sub_units": {"enabled": True}}},
        )
        DataLayerFactory.create(
            dataset=base_dataset,
            type=DataLayerType.RASTER,
            metadata={"modules": {"prioritize_sub_units": {"enabled": True}}},
        )

        module = get_module("prioritize_sub_units")
        configuration: Dict[str, Any] = module.get_configuration()
        sub_units = configuration["options"]["sub_units"]

        self.assertEqual(len(sub_units), 1)
        self.assertEqual(sub_units[0].type, DataLayerType.VECTOR)

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
        DataLayerFactory.create(
            dataset=private_base_dataset,
            type=DataLayerType.VECTOR,
            metadata={"modules": {"prioritize_sub_units": {"enabled": True}}},
        )
        DataLayerFactory.create(
            dataset=public_base_dataset,
            type=DataLayerType.VECTOR,
            metadata={"modules": {"prioritize_sub_units": {"enabled": True}}},
        )

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


class AdvancedStandLevelConstraintModuleTest(TestCase):
    def setUp(self):
        self.planning_area = PlanningAreaFactory.create()
        self.scenario = ScenarioFactory.create(planning_area=self.planning_area)
        self.module = get_module("advanced_stand_level_constraint")
        return super().setUp()

    def test_get_module_returns_advanced_stand_level_constraint_module(self):
        self.assertEqual(self.module.name, "advanced_stand_level_constraint")

    def test_can_run_scenario_but_not_planning_area(self):
        self.assertFalse(self.module.can_run(self.planning_area))
        self.assertTrue(self.module.can_run(self.scenario))

    def test_returns_empty_dataset_options(self):
        DatasetFactory.create(
            name="base1",
            preferred_display_type=PreferredDisplayType.BASE_DATALAYERS,
            visibility=VisibilityOptions.PUBLIC,
            modules=["advanced_stand_level_constraint"],
        )
        DatasetFactory.create(
            name="main1",
            preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS,
            visibility=VisibilityOptions.PUBLIC,
            modules=["advanced_stand_level_constraint"],
        )

        configuration = self.module.get_configuration()
        datasets = configuration["options"]["datasets"]

        self.assertEqual(len(datasets["main_datasets"]), 0)
        self.assertEqual(len(datasets["base_datasets"]), 0)

    def test_returns_datasets_containing_eligible_datalayers(self):
        main_dataset = DatasetFactory.create(
            visibility=VisibilityOptions.PUBLIC,
            preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS,
        )
        base_dataset = DatasetFactory.create(
            visibility=VisibilityOptions.PUBLIC,
            preferred_display_type=PreferredDisplayType.BASE_DATALAYERS,
        )
        ineligible_dataset = DatasetFactory.create(
            visibility=VisibilityOptions.PUBLIC,
            preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS,
        )
        enabled_metadata = {
            "modules": {"advanced_stand_level_constraint": {"enabled": True}}
        }
        DataLayerFactory.create_batch(
            2,
            dataset=main_dataset,
            type=DataLayerType.RASTER,
            metadata=enabled_metadata,
        )
        DataLayerFactory.create(
            dataset=base_dataset,
            type=DataLayerType.RASTER,
            metadata={"modules": {"advanced_stand_level_constraint": {}}},
        )
        DataLayerFactory.create(
            dataset=ineligible_dataset,
            type=DataLayerType.RASTER,
            metadata={
                "modules": {"advanced_stand_level_constraint": {"enabled": False}}
            },
        )
        DataLayerFactory.create(
            dataset=ineligible_dataset,
            type=DataLayerType.VECTOR,
            metadata=enabled_metadata,
        )
        DataLayerFactory.create(
            dataset=ineligible_dataset,
            type=DataLayerType.RASTER,
            status=DataLayerStatus.PENDING,
            metadata=enabled_metadata,
        )

        datasets = self.module.get_configuration()["options"]["datasets"]

        self.assertEqual(
            [dataset.id for dataset in datasets["main_datasets"]],
            [main_dataset.id],
        )
        self.assertEqual(
            [dataset.id for dataset in datasets["base_datasets"]],
            [base_dataset.id],
        )

    def test_returns_only_eligible_datalayers(self):
        dataset = DatasetFactory.create(visibility=VisibilityOptions.PUBLIC)
        enabled = DataLayerFactory.create(
            dataset=dataset,
            type=DataLayerType.RASTER,
            metadata={
                "modules": {"advanced_stand_level_constraint": {"enabled": True}}
            },
        )
        implicitly_enabled = DataLayerFactory.create(
            dataset=dataset,
            type=DataLayerType.RASTER,
            metadata={"modules": {"advanced_stand_level_constraint": {}}},
        )
        DataLayerFactory.create(
            dataset=dataset,
            type=DataLayerType.RASTER,
            metadata={
                "modules": {"advanced_stand_level_constraint": {"enabled": False}}
            },
        )
        DataLayerFactory.create(
            dataset=dataset,
            type=DataLayerType.RASTER,
            metadata={"modules": {"other": {"enabled": True}}},
        )
        DataLayerFactory.create(
            dataset=dataset,
            type=DataLayerType.VECTOR,
            metadata={
                "modules": {"advanced_stand_level_constraint": {"enabled": True}}
            },
        )
        DataLayerFactory.create(
            dataset=dataset,
            type=DataLayerType.RASTER,
            status=DataLayerStatus.PENDING,
            metadata={
                "modules": {"advanced_stand_level_constraint": {"enabled": True}}
            },
        )

        datalayers = self.module.get_configuration()["options"]["datalayers"]

        self.assertEqual(
            {datalayer.id for datalayer in datalayers},
            {enabled.id, implicitly_enabled.id},
        )

    def test_filters_datalayers_by_outline(self):
        included_dataset = DatasetFactory.create(
            visibility=VisibilityOptions.PUBLIC,
            preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS,
        )
        excluded_dataset = DatasetFactory.create(
            visibility=VisibilityOptions.PUBLIC,
            preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS,
        )
        metadata = {
            "modules": {"advanced_stand_level_constraint": {"enabled": True}}
        }
        included = DataLayerFactory.create(
            dataset=included_dataset,
            type=DataLayerType.RASTER,
            outline=GEOSGeometry(
                "MULTIPOLYGON(((0 0, 2 0, 2 2, 0 2, 0 0)))",
                srid=settings.DEFAULT_CRS,
            ),
            metadata=metadata,
        )
        DataLayerFactory.create(
            dataset=excluded_dataset,
            type=DataLayerType.RASTER,
            outline=GEOSGeometry(
                "MULTIPOLYGON(((3 3, 4 3, 4 4, 3 4, 3 3)))",
                srid=settings.DEFAULT_CRS,
            ),
            metadata=metadata,
        )
        geometry = GEOSGeometry(
            "MULTIPOLYGON(((1 1, 2 1, 2 2, 1 2, 1 1)))",
            srid=settings.DEFAULT_CRS,
        )

        options = self.module.get_configuration(geometry=geometry)["options"]
        datalayers = options["datalayers"]

        self.assertEqual([datalayer.id for datalayer in datalayers], [included.id])
        self.assertEqual(
            [dataset.id for dataset in options["datasets"]["main_datasets"]],
            [included_dataset.id],
        )

    def test_filters_datalayers_by_dataset_access(self):
        public_dataset = DatasetFactory.create(
            visibility=VisibilityOptions.PUBLIC,
            preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS,
        )
        private_dataset = DatasetFactory.create(
            visibility=VisibilityOptions.PRIVATE,
            preferred_display_type=PreferredDisplayType.MAIN_DATALAYERS,
        )
        metadata = {
            "modules": {"advanced_stand_level_constraint": {"enabled": True}}
        }
        public_layer = DataLayerFactory.create(
            dataset=public_dataset,
            type=DataLayerType.RASTER,
            metadata=metadata,
        )
        private_layer = DataLayerFactory.create(
            dataset=private_dataset,
            type=DataLayerType.RASTER,
            metadata=metadata,
        )

        anonymous_options = self.module.get_configuration()["options"]
        owner_options = self.module.get_configuration(user=private_dataset.created_by)[
            "options"
        ]
        anonymous_layers = anonymous_options["datalayers"]
        owner_layers = owner_options["datalayers"]

        self.assertEqual(
            {datalayer.id for datalayer in anonymous_layers}, {public_layer.id}
        )
        self.assertEqual(
            {datalayer.id for datalayer in owner_layers},
            {public_layer.id, private_layer.id},
        )
        self.assertEqual(
            {dataset.id for dataset in anonymous_options["datasets"]["main_datasets"]},
            {public_dataset.id},
        )
        self.assertEqual(
            {dataset.id for dataset in owner_options["datasets"]["main_datasets"]},
            {public_dataset.id, private_dataset.id},
        )

    def test_serializes_datalayers_as_list(self):
        dataset = DatasetFactory.create(visibility=VisibilityOptions.PUBLIC)
        datalayer = DataLayerFactory.create(
            dataset=dataset,
            type=DataLayerType.RASTER,
            metadata={
                "modules": {"advanced_stand_level_constraint": {"enabled": True}}
            },
        )

        serializer = self.module.get_serializer_class()(
            instance=self.module.get_configuration()
        )

        self.assertIs(
            self.module.get_serializer_class(), AdvancedStandLevelConstraintSerializer
        )
        self.assertIsInstance(serializer.data["options"]["datalayers"], list)
        self.assertEqual(
            [item["id"] for item in serializer.data["options"]["datalayers"]],
            [datalayer.id],
        )

    def test_capabilities_include_scenario_but_not_planning_area(self):
        scenario_capabilities = compute_scenario_capabilities(self.scenario)
        planning_area_capabilities = compute_planning_area_capabilities(
            self.planning_area
        )

        self.assertIn("ADVANCED_STAND_LEVEL_CONSTRAINT", scenario_capabilities)
        self.assertNotIn("ADVANCED_STAND_LEVEL_CONSTRAINT", planning_area_capabilities)


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
        aet_percentual = self.create_aet_datalayer("percentual")

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
            datalayers[FundingReportLayerCategory.WATER], [aet_percentual]
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
