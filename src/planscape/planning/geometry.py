import json
from typing import Any, Dict, Union
from django.contrib.gis.geos import MultiPolygon, GEOSGeometry


def coerce_geojson(geojson: Dict[str, Any]) -> GEOSGeometry:
    features = geojson.get("features", [])
    if len(features) > 1 or len(features) == 0:
        raise ValueError("Must send exactly one feature.")
    feature = features[0]
    geometry = feature["geometry"]
    return coerce_geometry(geometry)


def coerce_geometry(geometry: Union[Dict[str, Any] | GEOSGeometry]) -> GEOSGeometry:
    """This function takes in a GeoJSON
    geometry and tries to coerce it to
    a valid GEOSGeometry.
    """
    if isinstance(geometry, dict):
        if geometry["type"] == "Polygon":
            geometry["type"] = "MultiPolygon"
            geometry["coordinates"] = [geometry["coordinates"]]

        geometry = GEOSGeometry(json.dumps(geometry), srid=4326)

    geometry = geometry.buffer(0).unary_union

    if geometry.geom_type == "Polygon":
        geometry = MultiPolygon([geometry], srid=geometry.srid)

    if geometry.hasz:
        ogr_geometry = geometry.ogr.clone()
        ogr_geometry.coord_dim = 2
        geometry = GEOSGeometry(ogr_geometry.wkt)

    if not geometry.valid:
        raise ValueError("Geometry is invalid and cannot be used.")
    if geometry.geom_type != "MultiPolygon":
        raise ValueError("Could not parse geometry")
    return geometry
