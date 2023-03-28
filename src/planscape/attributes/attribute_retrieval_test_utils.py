from attributes.models import Attribute, AttributeRaster
from django.contrib.gis.gdal import GDALRaster


def create_attribute_raster(attribute_raster: GDALRaster,
                            attribute_raster_name: str) -> None:
    AttributeRaster.objects.create(
        name=attribute_raster_name, raster=attribute_raster)


def save_attribute_to_db(attribute_name: str,
                         attribute_raster_name: str,
                         attribute_raster: GDALRaster) -> int:
    attribute = Attribute.objects.create(
        attribute_name=attribute_name, raster_name=attribute_raster_name)
    create_attribute_raster(attribute_raster, attribute_raster_name)
    return attribute.pk
