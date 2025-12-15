from typing import Any, Dict

from datasets.models import PreferredDisplayType
from datasets.tests.factories import DatasetFactory
from django.test import TestCase

from modules.base import get_module


class MapModuleTest(TestCase):
    def test_returns_options_correctly(self):
        base_dataset = DatasetFactory.create(
            name="base1", preferred_display_type=PreferredDisplayType.BASE_DATALAYERS
        )
        main_dataset = DatasetFactory.create(
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

        self.assertEqual(1, len(main))
        self.assertEqual(1, len(base))

        main1 = main[0]
        base1 = base[0]

        self.assertEqual(main_dataset.name, main1.name)
        self.assertEqual(base_dataset.name, base1.name)
