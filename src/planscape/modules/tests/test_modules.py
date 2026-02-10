import json

from typing import Any, Dict

from datasets.models import PreferredDisplayType
from datasets.tests.factories import DatasetFactory, DataLayerFactory
from django.test import TestCase
from django.contrib.gis.geos import GEOSGeometry

from modules.base import get_module


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