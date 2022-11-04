from django.contrib.gis.db import models


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

    # The raster data associated with the condition.
    geometry = models.RasterField()

    # The type of condition, drawn from the ConditionScoreType enum defined in
    # base/condition_types.py (CURRENT, FUTURE, ADAPT, etc).
    condition_score_type: models.IntegerField = models.IntegerField(null=True)

    # True if the Condition represents raw, uninterpreted data.  This is appropriate only
    # when condition_score_type = CURRENT and condition_level = METRIC, and is ignored
    # otherwise.
    is_raw: models.BooleanField = models.BooleanField(null=True)
