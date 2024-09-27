import json
from django.conf import settings
from typing import Any, Dict, Optional, Union
from django.contrib.gis.geos import MultiPolygon, GEOSGeometry
from planscape.typing import TLooseGeom
from planscape.exceptions import InvalidGeometry


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


def from_geojson(geometry: TLooseGeom) -> GEOSGeometry:
    if isinstance(geometry, GEOSGeometry):
        return geometry

    return GEOSGeometry(json.dumps(geometry), srid=4326)


GEOMETRY_OPERATIONS = [
    from_geojson,
    fix_geometry,
    to_multipolygon,
    drop_z,
]


def coerce_geometry(geometry: TLooseGeom) -> GEOSGeometry:
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
