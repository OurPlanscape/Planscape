from django.contrib.gis.db import models
from django.conf import settings


class BaseCondition(models.Model):
    """
    A BaseCondition has a name and level, and an optional display/region name and level.
    """
    # The name of the condition.
    condition_name: models.CharField = models.CharField(max_length=120)

    # The level of the condition, drawn from the ConditionLevel enum defined in
    # base/condition_types.py (one of ECOSYSTEM, PILLAR, ELEMENT, METRIC).
    condition_level: models.IntegerField = models.IntegerField()

    # The name of the condition for use in interfaces.
    display_name: models.CharField = models.CharField(
        max_length=120, null=True)

    # The region associated with the condition, drawn from the RegionName enum in
    # base/region_name.py.
    region_name: models.CharField = models.CharField(max_length=120, null=True)


class Condition(models.Model):
    """
    A Condition is a single raster, referencing the ConditionDataset, with additional metadata
    describing the raster.
    """
    condition_dataset = models.ForeignKey(
        BaseCondition, on_delete=models.CASCADE)  # type: ignore

    # The name of the raster, used for accessing the tiles of the raster data
    # stored in the ConditionRaster table.
    raster_name: models.TextField = models.TextField(null=True)

    # The type of condition, drawn from the ConditionScoreType enum defined in
    # base/condition_types.py (CURRENT, FUTURE, ADAPT, etc).
    condition_score_type: models.IntegerField = models.IntegerField(null=True)

    # True if the Condition represents raw, uninterpreted data.  This is appropriate only
    # when condition_score_type = CURRENT and condition_level = METRIC, and is ignored
    # otherwise.
    is_raw: models.BooleanField = models.BooleanField(null=True)
        


class ConditionRaster(models.Model):
    """
    A ConditionRaster is a raster associated with a condition.  There may be multiple
    rows per condition, because rasters are more efficiently stored and queried in
    tiles.  The table is not managed by Django but populated by raster2psql, e.g.,

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

    # The name of the raster, which must match the raster_name in the Condition. 
    # WARNING: raster2pgsql does not work if this field name has any _ chars. 
    name: models.TextField = models.TextField(null=True)

    # A tile in the raster.
    raster = models.RasterField(null=True, srid=settings.CRS_FOR_RASTERS)

    condition = models.ForeignKey(Condition, null=True, on_delete=models.CASCADE, related_name="raster_tiles",)
