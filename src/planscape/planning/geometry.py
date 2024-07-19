import json
from django.conf import settings
from shapely import wkt
from shapely.geometry import shape
from typing import Any, Dict, Union
from django.contrib.gis.geos import MultiPolygon, GEOSGeometry, Polygon

from planscape.exceptions import InvalidGeometry


def coerce_geojson(geojson: Dict[str, Any]) -> GEOSGeometry:
    features = geojson.get("features", [])
    if len(features) > 1 or len(features) == 0:
        raise ValueError("Must send exactly one feature.")
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

    print(f"\nLarger shape looks like: {larger_geometry}")
    try:
        if isinstance(larger_geometry, str):
            # Remove the SRID part if present
            if "SRID=" in larger_geometry:
                larger_geometry = larger_geometry.split(";", 1)[1]
            # Convert the WKT to a Shapely MultiPolygon
            larger_shape = wkt.loads(larger_geometry)
        elif isinstance(larger_geometry, MultiPolygon):
            larger_shape = larger_geometry
            # larger_g = larger_geometry["geometry"]
            # wkt_str = larger_geometry.split(";", 1)[1]
            # # multip = str(larger_geometry).split(";")[1]
            # # larger_shape = shape(multip)
            # larger_shape = wkt.loads(wkt_str)
        else:
            print(f"We don't know what this is: {larger_geometry}")
    except Exception as e:
        print(f"Could not convert larger shape {e}")

    # determine whether we have a feature collection or individual geometry
    if "features" in smaller_geometry:
        # for f in smaller_geometry['features']:
        within = True
        for feature in smaller_geometry["features"]:
            print(f"here is a feature: {feature['geometry']}")
            feature_shape = shape(feature["geometry"])
            print(f"type of feature_shape {feature_shape} is {type(feature_shape)}")
            print(f"type of larger_shape {larger_shape} is {type(larger_shape)}")

            if not isinstance(feature_shape, (MultiPolygon, Polygon)):
                print(
                    f"feature_shape {type(feature_shape)} is not a Multipolygon or polygon"
                )
            if not isinstance(larger_shape, (MultiPolygon, Polygon)):
                print(
                    f"larger_shape {type(larger_shape)} is not a Multipolygon or polygon"
                )
            feature_shape = shape(feature_shape)
            if ";" in larger_shape:
                larger_shape = larger_shape.split(";", 1)[1]
                larger_shape = shape(larger_shape)
            print(f"type of feature_shape {feature_shape} is {type(feature_shape)}")
            print(f"type of larger_shape {larger_shape} is {type(larger_shape)}")
            if not feature_shape.within(larger_shape):
                within = False
        return within

        # return all(
        #     shape(feature['geometry']).within(larger_shape)
        # )

    try:
        smaller_g = smaller_geometry["geometry"]
        smaller_shape = shape(smaller_g)
    except Exception as e:
        print(f"Could not convert smaller shape {e}")
    return smaller_shape.within(larger_shape)


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


def validate_geometry(geometry):
    if not isinstance(geometry, GEOSGeometry):
        geometry = GEOSGeometry(
            geometry,
            srid=settings.CRS_INTERNAL_REPRESENTATION,
        )

    if geometry.srid != settings.CRS_INTERNAL_REPRESENTATION:
        geometry = geometry.transform(settings.CRS_INTERNAL_REPRESENTATION, clone=True)

    geometry = coerce_geometry(geometry)

    return geometry
