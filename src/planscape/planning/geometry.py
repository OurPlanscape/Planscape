import json
import logging
from django.conf import settings
from shapely import wkt
from shapely.ops import unary_union
from shapely.geometry import shape
from typing import Any, Dict, Union
from django.contrib.gis.geos import MultiPolygon, GEOSGeometry

from planscape.exceptions import InvalidGeometry

logger = logging.getLogger(__name__)


def coerce_geojson(geojson: Dict[str, Any]) -> GEOSGeometry:
    features = geojson.get("features", [])
    if len(features) > 1 or len(features) == 0:
        raise InvalidGeometry("Must send exactly one feature.")
    feature = features[0]
    geometry = feature.get("geometry", {}) or {}
    return coerce_geometry(geometry)


def drop_z(geometry: GEOSGeometry) -> GEOSGeometry:
    if not geometry.hasz:
        return geometry

    ogr_geometry = geometry.ogr.clone()
    ogr_geometry.coord_dim = 2
    return GEOSGeometry(ogr_geometry.wkt, srid=geometry.srid)


def fix_geometry(geometry: GEOSGeometry) -> GEOSGeometry:
    return geometry.clone().buffer(0).unary_union


def to_multipolygon(geometry: GEOSGeometry) -> GEOSGeometry:
    if geometry.geom_type == "MultiPolygon":
        return geometry

    return MultiPolygon([geometry], srid=geometry.srid)


def from_geojson(geometry: Union[Dict[str, Any] | GEOSGeometry]) -> GEOSGeometry:
    if isinstance(geometry, GEOSGeometry):
        return geometry

    return GEOSGeometry(json.dumps(geometry), srid=4326)


GEOMETRY_OPERATIONS = [
    from_geojson,
    fix_geometry,
    to_multipolygon,
    drop_z,
]


def get_acreage(geometry: GEOSGeometry):
    epsg_5070_area = geometry.transform(settings.AREA_SRID, clone=True).area
    acres = epsg_5070_area / settings.CONVERSION_SQM_ACRES
    return acres


def is_inside(larger_geometry, smaller_geometry):
    larger_shape = None
    smaller_shape = None

    # TODO: clean up coercions / add new functions to convert various formats
    try:
        if isinstance(larger_geometry, MultiPolygon):
            geojson_dict = {
                "type": "MultiPolygon",
                "coordinates": [polygon.coords for polygon in larger_geometry],
            }
            larger_shape = shape(geojson_dict)
        elif isinstance(larger_geometry, GEOSGeometry):
            larger_shape = shape(larger_geometry)
        elif "features" in larger_geometry:
            shapes = [
                shape(feature["geometry"]) for feature in larger_geometry["features"]
            ]
            larger_shape = unary_union(shapes)
        elif "SRID=" in larger_geometry:
            larger_geometry = larger_geometry.split(";", 1)[1]
            larger_shape = wkt.loads(larger_geometry)
        else:
            larger_shape = shape(larger_geometry["geometry"])
    except Exception as e:
        logger.error(f"Could not convert larger shape when comparing containment: {e}")

    # for smaller shape: determine whether we have a feature collection or individual geometry
    if "features" in smaller_geometry:
        return all(
            shape(feature["geometry"]).within(larger_shape)
            for feature in smaller_geometry["features"]
        )
    try:
        smaller_shape = shape(smaller_geometry["geometry"])
        return smaller_shape.within(larger_shape)
    except Exception as e:
        logger.error(f"Could not convert smaller shape to compare containment {e}")


def coerce_geometry(geometry: Union[Dict[str, Any] | GEOSGeometry]) -> GEOSGeometry:
    """This function takes in a GeoJSON
    geometry and tries to coerce it to
    a valid GEOSGeometry.
    """
    try:
        for operation in GEOMETRY_OPERATIONS:
            geometry = operation(geometry)
    except Exception:
        raise InvalidGeometry("Geometry is invalid and cannot be processed.")

    if not geometry.valid:
        raise InvalidGeometry("Geometry is invalid and cannot be used.")
    if geometry.geom_type != "MultiPolygon":
        raise InvalidGeometry("Could not parse geometry")

    return geometry
