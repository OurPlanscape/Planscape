from typing import Collection, List, Optional

from django.contrib.gis.geos import GeometryCollection, GEOSGeometry, Polygon


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
