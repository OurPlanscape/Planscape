from django.test import TestCase
from pathlib import Path

from datasets.management.commands.datalayers import get_datalayer_metadata


class DataLayerCreateTest(TestCase):
    def test_file_metadata_qgis(self):
        path = Path("./assets/qgis_metadata.tif")
        metadata = get_datalayer_metadata(path)
        self.assertIsNotNone(metadata)
