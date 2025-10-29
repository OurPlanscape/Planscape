import tempfile
from pathlib import Path

import numpy as np
import rasterio
from django.contrib.gis.geos import MultiPolygon, Polygon
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

        transform = from_bounds(-120, 38, -119, 39, width, height)
        with rasterio.open(
            self.raster_path,
            "w",
            driver="GTiff",
            height=height,
            width=width,
            count=1,
            dtype=rasterio.float32,
            crs="EPSG:4269",
            transform=transform,
            nodata=-9999,
        ) as dst:
            dst.write(data, 1)

        self.planning_area_geom = MultiPolygon(
            [
                Polygon(
                    (
                        (-119.7, 38.3),
                        (-119.3, 38.3),
                        (-119.3, 38.7),
                        (-119.7, 38.7),
                        (-119.7, 38.3),
                    )
                )
            ]
        )

    def tearDown(self):
        import shutil

        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_calculate_percentiles_with_clipping(self):
        datalayer = DataLayerFactory(
            type=DataLayerType.RASTER,
            url=str(self.raster_path),
        )

        result = calculate_layer_percentiles(datalayer, self.planning_area_geom)

        self.assertIn("statistics", result)
        stats = result["statistics"]

        self.assertIn("min", stats)
        self.assertIn("max", stats)
        self.assertIn("mean", stats)
        self.assertIn("std", stats)
        self.assertIn("count", stats)
        self.assertIn("percentiles", stats)

        percentiles = stats["percentiles"]
        self.assertIn("p5", percentiles)
        self.assertIn("p10", percentiles)
        self.assertIn("p90", percentiles)
        self.assertIn("p95", percentiles)

        self.assertLess(percentiles["p5"], percentiles["p10"])
        self.assertLess(percentiles["p10"], percentiles["p90"])
        self.assertLess(percentiles["p90"], percentiles["p95"])

        self.assertLess(stats["min"], stats["max"])
        self.assertGreater(stats["count"], 0)

    def test_calculate_percentiles_non_raster_fails(self):
        datalayer = DataLayerFactory(type=DataLayerType.VECTOR)

        with self.assertRaises(ValueError):
            calculate_layer_percentiles(datalayer, self.planning_area_geom)

    def test_calculate_percentiles_no_url_fails(self):
        datalayer = DataLayerFactory(type=DataLayerType.RASTER, url=None)

        with self.assertRaises(ValueError):
            calculate_layer_percentiles(datalayer, self.planning_area_geom)

    def test_calculate_percentiles_with_downsampling(self):
        datalayer = DataLayerFactory(
            type=DataLayerType.RASTER,
            url=str(self.raster_path),
        )

        result = calculate_layer_percentiles(
            datalayer, self.planning_area_geom, target_sample_size=100
        )

        stats = result["statistics"]
        self.assertLess(stats["percentiles"]["p5"], stats["percentiles"]["p95"])
