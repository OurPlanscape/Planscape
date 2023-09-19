from django.contrib.gis.geos import GEOSGeometry
from conditions.raster_utils import RasterPixelValues, get_pixel_values_from_raster
from attributes.models import AttributeRaster


# Name of the table and column from models.py.
RASTER_ATTRIBUTE_TABLE = "attributes_attributeraster"


# Values retrieved via get_attribute_values_from_raster.
# Columns include 1) lists of values and x/y pixel positions and 2) the
# x/y coordinates of the top-left pixel.
AttributePixelValues = RasterPixelValues


# Validates that the raster name exists.
# This should be called before a postGIS function call.
def _validate_attribute_raster_name(raster_name: str) -> None:
    if len(AttributeRaster.objects.filter(name=raster_name).all()) == 0:
        raise AssertionError("no rasters available for raster_name, %s" % (raster_name))


# Fetches raster pixel values for all non-NaN pixels that intersect with geo.
# If no intersection exists, returns None.
def get_attribute_values_from_raster(
    geo: GEOSGeometry, raster_name: str
) -> AttributePixelValues | None:
    _validate_attribute_raster_name(raster_name)
    return get_pixel_values_from_raster(geo, RASTER_ATTRIBUTE_TABLE, raster_name)
