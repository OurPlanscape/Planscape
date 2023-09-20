from django.contrib.gis.db import models
from planscape.settings import CRS_FOR_RASTERS


class Attribute(models.Model):
    """
    An Attribute has a name, an optional display name, and a raster_name.
    """

    # The name of the attribute.
    attribute_name: models.CharField = models.CharField(max_length=120)

    # The name of the condition for use in interfaces.
    display_name: models.CharField = models.CharField(max_length=120, null=True)

    # The name of the raster, used for accessing the tiles of the raster data
    # stored in the AttributeRaster table.
    raster_name: models.TextField = models.TextField()


class AttributeRaster(models.Model):
    """
    An AttributeRaster is a raster associated with a land attribute such as 
    ownership, slope, and distance from road.  There may be multiple rows per 
    condition because rasters are more efficiently stored and queried in
    tiles.  The table is not managed by Django but populated by raster2psql, 
    e.g.,
       raster2pgsql -s 9822 -a -I -C -Y -F –n name -f raster -t 256x256 \
          ~/Downloads/attributes/slope_300m.tif \
          public.attributes_attributeraster | \
          psql -U planscape -d planscape -h localhost -p 5432 
    When this command is run, the string stored in the column 'name' will be the
    name of the file, i.e., 'slope_300m.tif'. 
    WARNING: This model has been tailored to match the output of raster2pgsql;
    any changes should be carefully considered.
    """

    # Primary key; predetermined by raster2pgsql
    rid: models.AutoField = models.AutoField(primary_key=True)

    # The name of the raster, which must match the raster_name in the
    # Attribute.
    name: models.TextField = models.TextField(null=True)

    # A tile in the raster.
    raster = models.RasterField(null=True, srid=CRS_FOR_RASTERS)
