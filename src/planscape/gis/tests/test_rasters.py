import json
import tempfile
from pathlib import Path

import numpy as np
import rasterio
from django.test import SimpleTestCase
from fiona.transform import transform_geom
from rasterio.transform import Affine
from typing import Any, Dict

from gis.rasters import get_profile, warp


def get_geojson_test_features():
    with open("impacts/tests/test_data/stands.geojson") as fp:
        geojson = json.loads(fp.read())
    return geojson


def transform_geojson(geojson: Dict[str, Any], to_espg: int = 3857) -> Dict[str, Any]:
    features = geojson.get("features", []) or []
    new_features = []
    for f in features:
        old_geometry = f.get("geometry")
        new_geometry = transform_geom("EPSG:4326", f"EPSG:{to_espg}", geom=old_geometry)
        f = {**f, "geometry": new_geometry.__geo_interface__}
        new_features.append(f)
    return {**geojson, "features": new_features}


class GetProfileTest(SimpleTestCase):
    def test_sets_explicit_nodata(self):
        profile = get_profile(
            input_profile={"dtype": "float32", "count": 1},
            crs="EPSG:3857",
            transform=Affine.identity(),
            width=10,
            height=10,
            nodata=-9999.0,
        )

        self.assertEqual(profile["nodata"], -9999.0)

    def test_defaults_nodata_to_none(self):
        profile = get_profile(
            input_profile={"dtype": "float32", "count": 1, "nodata": 5.0},
            crs="EPSG:3857",
            transform=Affine.identity(),
            width=10,
            height=10,
        )

        # Explicit nodata=None overrides whatever the spread input_profile carried,
        # since callers must now pass nodata deliberately rather than relying on
        # whatever happened to be inherited from the source file's own profile.
        self.assertIsNone(profile["nodata"])


def write_rotated_raster(path: Path, nodata: float, value: float) -> None:
    # A transform with rotation means the source raster occupies a rotated
    # rectangle. Reprojecting into an axis-aligned destination grid that covers
    # its bounding box necessarily leaves the corners uncovered - a
    # deterministic way to force warp()-introduced fill/margin pixels without
    # relying on real-world projection distortion.
    transform = Affine.translation(1000, 1000) * Affine.rotation(45) * Affine.scale(10, -10)
    with rasterio.open(
        path,
        "w",
        driver="GTiff",
        height=6,
        width=6,
        count=1,
        dtype=np.float32,
        crs="EPSG:3857",
        transform=transform,
        nodata=nodata,
    ) as dst:
        dst.write(np.full((6, 6), value, dtype=np.float32), 1)


class WarpNodataPropagationTest(SimpleTestCase):
    def setUp(self):
        tmp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(tmp_dir.cleanup)
        self.tmp_dir = Path(tmp_dir.name)

    def test_warp_propagates_source_nodata_to_output_profile(self):
        input_path = self.tmp_dir / "rotated.tif"
        output_path = self.tmp_dir / "warped.tif"
        write_rotated_raster(input_path, nodata=-9999.0, value=7.0)

        warp(
            input_file=str(input_path),
            output_file=str(output_path),
            crs="EPSG:3857",
        )

        with rasterio.open(output_path) as dst:
            self.assertEqual(dst.nodata, -9999.0)

    def test_warp_fills_margin_pixels_with_nodata_not_zero(self):
        input_path = self.tmp_dir / "rotated.tif"
        output_path = self.tmp_dir / "warped.tif"
        write_rotated_raster(input_path, nodata=-9999.0, value=7.0)

        warp(
            input_file=str(input_path),
            output_file=str(output_path),
            crs="EPSG:3857",
        )

        with rasterio.open(output_path) as dst:
            data = dst.read(1)
            # The corner of the axis-aligned bounding box falls outside the
            # rotated source rectangle, so it must read as nodata - not as an
            # untagged 0 that would be indistinguishable from real data.
            self.assertEqual(data[0, 0], -9999.0)
            self.assertEqual(data[data.shape[0] // 2, data.shape[1] // 2], 7.0)
