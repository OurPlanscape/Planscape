from django.contrib.gis.db import models
from planscape.settings import CRS_FOR_RASTERS

class BaseAttribute(models.Model):
    """
    A BaseAttribute has a name and an optional display/region name.
    """
    # The name of the attribute.
    attribute_name: models.CharField = models.CharField(max_length=120)

    # The name of the condition for use in interfaces.
    display_name: models.CharField = models.CharField(
        max_length=120, null=True)

    # The region associated with the attribute, drawn from the RegionName enum 
    # in base/region_name.py.
    region_name: models.CharField = models.CharField(max_length=120, null=True)


class Attribute(models.Model):
    """
    An Attribute is a single raster, referencing the AttributeDataset, with 
    additional metadata describing the raster.
    """
    attribute_dataset = models.ForeignKey(
        BaseAttribute, on_delete=models.CASCADE)  # type: ignore

    # The name of the raster, used for accessing the tiles of the raster data
    # stored in the AttributeRaster table.
    raster_name: models.TextField = models.TextField(null=True)


class AttributeRaster(models.Model):
    """
    An AttributeRaster is a raster associated with a land attribute such as 
    ownership, slope, and distance from road.  There may be multiple rows per 
    condition because rasters are more efficiently stored and queried in
    tiles.  The table is not managed by Django but populated by raster2psql, 
    e.g.,
       raster2pgsql -s 9822 -a -I -C -Y -F –n name -f raster -t 256x256 \
          ~/Downloads/wood/AvailableBiomass_2021_300m_base.tif \
          public.conditions_conditionraster | \
          psql -U planscape -d planscape -h localhost -p 5432 
    When this command is run, the string stored in the column 'name' will be the
    name of the file, i.e., 'AvailableBiomass_2021_300m_base.tif'. 
    WARNING: This model has been tailored to match the output of raster2pgsql;
    any changes should be carefully considered.
    """

    # Primary key; predetermined by raster2pgsql
    rid: models.AutoField = models.AutoField(primary_key=True)

    # The name of the raster, which must match the raster_name in the 
    # Attribute. 
    # WARNING: raster2pgsql does not work if this field name has any _ chars. 
    name: models.TextField = models.TextField(null=True)

    # A tile in the raster.
    raster = models.RasterField(null=True, srid=CRS_FOR_RASTERS)