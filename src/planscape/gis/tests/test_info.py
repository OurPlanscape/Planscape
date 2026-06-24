import json
import tempfile
from pathlib import Path

import numpy as np
import rasterio
from django.test import SimpleTestCase
from rasterio.transform import from_origin

from gis.info import info_raster


def write_test_raster(path: Path, nodata: float) -> None:
    transform = from_origin(0, 10, 10, 10)
    with rasterio.open(
        path,
        "w",
        driver="GTiff",
        height=2,
        width=2,
        count=1,
        dtype=np.float32,
        crs="EPSG:3857",
        transform=transform,
        nodata=nodata,
    ) as dst:
        # Real data values, unrelated to the nodata value itself - mirrors a
        # clipped raster whose nodata happens to be set to NaN in its profile.
        dst.write(np.array([[1.0, 2.0], [3.0, 4.0]], dtype=np.float32), 1)


class InfoRasterNonFiniteValuesTests(SimpleTestCase):
    def setUp(self):
        tmp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(tmp_dir.cleanup)
        self.tmp_dir = Path(tmp_dir.name)

    def test_nan_nodata_is_sanitized_to_none(self):
        path = self.tmp_dir / "nan_nodata.tif"
        write_test_raster(path, float("nan"))

        info = info_raster(str(path))

        self.assertIsNone(info["nodata"])
        # PostgreSQL's json/jsonb columns reject the NaN token; allow_nan=False
        # mirrors that strictness, so this proves the result is storable.
        json.dumps(info, allow_nan=False)

    def test_finite_nodata_is_preserved(self):
        path = self.tmp_dir / "finite_nodata.tif"
        write_test_raster(path, -9999.0)

        info = info_raster(str(path))

        self.assertEqual(info["nodata"], -9999.0)
