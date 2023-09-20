from django.contrib.gis.geos import GEOSGeometry, MultiPolygon

_MULTIPOLYGON = 6
_POLYGON = 3


# Given a GEOSGeometry, validates that it represents either a Polygon or
# MultiPolygon, then returns a MultiPolygon.
def get_multipolygon(geo: GEOSGeometry) -> MultiPolygon:
    if geo.geom_typeid == _MULTIPOLYGON:
        return geo
    elif geo.geom_typeid == _POLYGON:
        multi = MultiPolygon((geo))
        multi.srid = geo.srid
        return multi

    raise Exception("geometry, %s, is neither a polygon nor a multipolygon" % (geo.wkt))
