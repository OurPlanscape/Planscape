from typing import Collection, List, Optional

from django.contrib.gis.geos import (
    GeometryCollection,
    GEOSGeometry,
    MultiLineString,
    MultiPoint,
    MultiPolygon,
    Polygon,
)
from rasterio.warp import transform_geom
from shapely.geometry import mapping, shape


def to_geodjango_geometry(shapely_geom, srid=4326):
    """
    Converts a shapely geometry to a geodjango geometry
    """
    return GEOSGeometry(shapely_geom.wkt, srid=srid)


def get_bounding_box(geometries: List[GEOSGeometry]) -> Optional[Collection[float]]:
    if not geometries or len(geometries) <= 0:
        return None
    col = GeometryCollection(*geometries)
    return col.extent


def get_bounding_polygon(geometries: List[GEOSGeometry]) -> GEOSGeometry:
    extent = get_bounding_box(geometries)
    if not extent:
        return Polygon()
    xmin, ymin, xmax, ymax = extent

    return Polygon(
        [
            [xmin, ymin],
            [xmin, ymax],
            [xmax, ymax],
            [xmax, ymin],
            [xmin, ymin],
        ],
        srid=geometries[0].srid,
    )


def shapely_reproject(geometry, src_crs, dst_crs):
    geometry = shape(
        transform_geom(
            src_crs,
            dst_crs,
            mapping(geometry),
            precision=6,
        )
    )
    return geometry


def geodjango_to_multi(geometry: GEOSGeometry) -> GEOSGeometry:
    klass = GeometryCollection
    match geometry.geom_type:
        case "MultiPolygon" | "MultiLineString" | "MultiPoint":
            return geometry
        case "Polygon":
            klass = MultiPolygon
        case "LineString":
            klass = MultiLineString
        case "Point":
            klass = MultiPoint

    return klass([geometry], srid=geometry.srid)


def geojson_to_multi(geometry):
    if geometry["type"].startswith("Multi"):
        return geometry

    new_coordinates = [geometry.get("coordinates")]
    new_type = f"Multi{geometry['type']}"
    return {
        "type": new_type,
        "coordinates": new_coordinates,
    }
