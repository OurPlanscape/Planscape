from django.contrib.gis.db import models
from base.condition_types import ConditionLevel, ConditionScoreType


class AbstractCondition(models.Model):
    """An AbstractCondition has a name and optional display and region names."""
    condition_name: models.CharField = models.CharField(max_length=120)
    # Optional fields for Condition
    display_name: models.CharField = models.CharField(
        max_length=120, null=True)
    region_name: models.CharField = models.CharField(max_length=120, null=True)


class Condition(models.Model):
    """
    A Condition object is a single raster, referencing the Condition 
    object, with additional metadata about its level and type.
    """
    condition = models.ForeignKey(AbstractCondition, on_delete=models.CASCADE)  # type: ignore
    geometry = models.RasterField()
    condition_level = ConditionLevel
    condition_score_type = ConditionScoreType
