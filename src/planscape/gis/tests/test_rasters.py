import json
import fiona
from fiona.transform import transform_geom
from typing import Any, Dict
from unittest import TestCase

from gis.rasters import get_zonal_stats


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


class GetZonalStatsTestCase(TestCase):
    def test_get_zonal_stats_returns_zonal_stats(self):
        input_raster = "impacts/tests/test_data/test_raster.tif"
        test_features = transform_geojson(get_geojson_test_features())
        stats = get_zonal_stats(
            input_raster=input_raster,
            features=test_features.get("features"),
        )
        self.assertIsNotNone(stats)
        means = [f.get("properties", {}).get("mean") for f in stats]
        for mean in means:
            self.assertIsNotNone(mean)

    def test_get_zonal_stats_returns_zonal_stats_min_max(self):
        input_raster = "impacts/tests/test_data/test_raster.tif"
        test_features = transform_geojson(get_geojson_test_features())
        stats = get_zonal_stats(
            input_raster=input_raster,
            features=test_features.get("features"),
            aggregations=["min", "max"],
        )
        self.assertIsNotNone(stats)
        mins = [f.get("properties", {}).get("min") for f in stats]
        maxs = [f.get("properties", {}).get("min") for f in stats]
        for v in mins:
            self.assertIsNotNone(v)
        for v in maxs:
            self.assertIsNotNone(v)

    def test_get_zonal_stats_fails_without_raster(self):
        with self.assertRaises(ValueError):
            test_features = get_geojson_test_features()
            get_zonal_stats(
                input_raster=None,
                features=test_features.get("features"),
            )

    def test_get_zonal_stats_fails_without_raster2(self):
        with self.assertRaises(ValueError):
            test_features = get_geojson_test_features()
            get_zonal_stats(
                input_raster="",
                features=test_features.get("features"),
            )

    def test_get_zonal_stats_fails_without_features(self):
        with self.assertRaises(ValueError):
            get_zonal_stats(
                input_raster="impacts/tests/test_data/test_raster.tif",
                features=None,
            )

    def test_get_zonal_stats_fails_without_features2(self):
        with self.assertRaises(ValueError):
            get_zonal_stats(
                input_raster="impacts/tests/test_data/test_raster.tif",
                features=[],
            )

    def test_get_zonal_stats_fails_without_aggregations(self):
        with self.assertRaises(ValueError):
            input_raster = "impacts/tests/test_data/test_raster.tif"
            test_features = get_geojson_test_features()
            get_zonal_stats(
                input_raster=input_raster,
                features=test_features.get("features"),
                aggregations=None,
            )

    def test_get_zonal_stats_fails_without_aggregations2(self):
        with self.assertRaises(ValueError):
            input_raster = "impacts/tests/test_data/test_raster.tif"
            test_features = get_geojson_test_features()
            get_zonal_stats(
                input_raster=input_raster,
                features=test_features.get("features"),
                aggregations=[],
            )
