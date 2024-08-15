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


# TODO: make this work more like the coerce_geometry function, but not union
def geojson_to_geosgeometry(geojson_data):
    # the geojson could be a few different things...

    # if this is a string, convert it to a dict
    if isinstance(geojson_data, str):
        geojson_data = json.loads(geojson_data)

    # if this is a feature collection
    # ...

    # if this is a feature...

    geometry = geojson_data["features"][0]["geometry"]
    geometry_json = json.dumps(geometry)
    try:
        geos_geom = GEOSGeometry(geometry_json)
        if geos_geom.srid != 4326:
            geos_geom.transform(4326, clone=True)
        return geos_geom

    except Exception as e:
        logger.error(f"Could not convert to GEOSGeometry: {e}")
        raise e


def is_inside(larger_geometry, smaller_geometry) -> bool:
    larger_geom = geojson_to_geosgeometry(larger_geometry)
    smaller_geom = geojson_to_geosgeometry(smaller_geometry)

    return larger_geom.contains(smaller_geom)


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

    try:
        _ = geometry.transform(settings.AREA_SRID, clone=True)
    except Exception:
        raise InvalidGeometry(
            ("Geometry could not be reprojected , thus it's invalid.")
        )

    if not geometry.valid:
        raise InvalidGeometry("Geometry is invalid and cannot be used.")
    if geometry.geom_type != "MultiPolygon":
        raise InvalidGeometry("Could not parse geometry")

    return geometry
