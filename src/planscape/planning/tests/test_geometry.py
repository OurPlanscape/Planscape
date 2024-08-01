import json
import fiona
from shapely.geometry import shape
from django.test import TestCase
from django.contrib.gis.geos import GEOSGeometry
from planning.geometry import coerce_geojson, coerce_geometry
from planscape.exceptions import InvalidGeometry


def read_shapefile(path):
    return fiona.open(path)


def to_geometry(fiona_geom) -> GEOSGeometry:
    shapely_geom = shape(fiona_geom)
    return GEOSGeometry(shapely_geom.wkt, srid=4326)


class GeometryTestCase(TestCase):
    def setUp(self):
        with read_shapefile("planning/tests/data/self-intersection.shp") as col:
            self.self_intersection = to_geometry(col[0].geometry)

    def coerce_geometry_raises_error_on_invalid_geom1(self):
        with self.assertRaises(
            InvalidGeometry, msg="Geometry is invalid and cannot be used."
        ):
            coerce_geometry(self.self_intersection)

    def coerce_geojson_raises_error_on_invalid_geom1(self):
        with self.assertRaises(
            InvalidGeometry, msg="Geometry is invalid and cannot be used."
        ):
            data = {"features": [{"geometry": json.loads(self.self_intersection.json)}]}
            coerce_geojson(data)
