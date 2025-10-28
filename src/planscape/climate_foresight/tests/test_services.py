import tempfile
from pathlib import Path

import numpy as np
import rasterio
from django.test import TestCase
from rasterio.transform import from_bounds

from climate_foresight.services import calculate_layer_percentiles
from datasets.models import DataLayerType
from datasets.tests.factories import DataLayerFactory


class CalculateLayerPercentilesTest(TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.raster_path = Path(self.temp_dir) / "test_raster.tif"

        width, height = 100, 100
        data = np.arange(width * height, dtype=np.float32).reshape(height, width)
        data[0:10, 0:10] = -9999

        transform = from_bounds(0, 0, width, height, width, height)
        with rasterio.open(
            self.raster_path,
            "w",
            driver="GTiff",
            height=height,
            width=width,
            count=1,
            dtype=rasterio.float32,
            transform=transform,
            nodata=-9999,
        ) as dst:
            dst.write(data, 1)

    def tearDown(self):
        import shutil

        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_calculate_percentiles_basic(self):
        datalayer = DataLayerFactory(
            type=DataLayerType.RASTER,
            url=str(self.raster_path),
        )

        result = calculate_layer_percentiles(datalayer)

        self.assertIn("outlier_thresholds", result)
        thresholds = result["outlier_thresholds"]
        self.assertIn("p5", thresholds)
        self.assertIn("p10", thresholds)
        self.assertIn("p90", thresholds)
        self.assertIn("p95", thresholds)
        self.assertLess(thresholds["p5"], thresholds["p10"])
        self.assertLess(thresholds["p10"], thresholds["p90"])
        self.assertLess(thresholds["p90"], thresholds["p95"])

    def test_calculate_percentiles_non_raster_fails(self):
        datalayer = DataLayerFactory(type=DataLayerType.VECTOR)

        with self.assertRaises(ValueError):
            calculate_layer_percentiles(datalayer)

    def test_calculate_percentiles_no_url_fails(self):
        datalayer = DataLayerFactory(type=DataLayerType.RASTER, url=None)

        with self.assertRaises(ValueError):
            calculate_layer_percentiles(datalayer)

    def test_calculate_percentiles_with_downsampling(self):
        datalayer = DataLayerFactory(
            type=DataLayerType.RASTER,
            url=str(self.raster_path),
        )

        result = calculate_layer_percentiles(datalayer, target_sample_size=100)

        thresholds = result["outlier_thresholds"]
        self.assertLess(thresholds["p5"], thresholds["p95"])
