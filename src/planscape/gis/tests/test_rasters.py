import json
from fiona.transform import transform_geom
from typing import Any, Dict
from unittest import TestCase


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
