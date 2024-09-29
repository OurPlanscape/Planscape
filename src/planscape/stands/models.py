from typing import Type, Union
from django.contrib.gis.db import models
from django.contrib.gis.geos import GEOSGeometry
from django.db.models import QuerySet
from conditions.models import Condition
from core.models import CreatedAtMixin


class StandSizeChoices(models.TextChoices):
    SMALL = "SMALL", "Small"
    MEDIUM = "MEDIUM", "Medium"
    LARGE = "LARGE", "Large"


STAND_LENGTH_METERS = {
    # 200 ha / 500ac
    StandSizeChoices.LARGE: 877.38267558,
    # 40 ha / 100ac
    StandSizeChoices.MEDIUM: 392.377463,
    # 4ha / 10ac
    StandSizeChoices.SMALL: 124.0806483,
}

STAND_AREA_ACRES = {
    # 200 ha / 500ac
    StandSizeChoices.LARGE: 494.2,
    # 40 ha / 100ac
    StandSizeChoices.MEDIUM: 98.84,
    # 4ha / 10ac
    StandSizeChoices.SMALL: 9.884,
}


def length_from_size(size: Union[str | StandSizeChoices]) -> float:
    return STAND_LENGTH_METERS[size]


def area_from_size(size: Union[str | StandSizeChoices]) -> float:
    return STAND_AREA_ACRES[size]


class StandManager(models.Manager):
    def overlapping(
        self, target_geometry: GEOSGeometry, stand_size: str | StandSizeChoices
    ) -> QuerySet["Stand"]:
        queryset = self.get_queryset()
        return queryset.filter(
            geometry__intersects=target_geometry,
            size=stand_size,
        )


class Stand(CreatedAtMixin, models.Model):
    size = models.CharField(
        choices=StandSizeChoices.choices,
        max_length=16,
    )

    geometry = models.PolygonField(srid=4269, spatial_index=True)

    area_m2 = models.FloatField()

    objects = StandManager()

    class Meta:
        indexes = [
            models.Index(
                fields=[
                    "size",
                ],
                name="stand_size_index",
            )
        ]


class StandMetric(CreatedAtMixin, models.Model):
    stand = models.ForeignKey(Stand, related_name="metrics", on_delete=models.CASCADE)

    condition = models.ForeignKey(
        Condition, related_name="metrics", on_delete=models.CASCADE
    )

    min = models.FloatField(null=True)

    avg = models.FloatField(null=True)

    max = models.FloatField(null=True)

    sum = models.FloatField(null=True)

    count = models.IntegerField(null=True)

    majority = models.FloatField(null=True)

    minority = models.FloatField(null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "stand",
                    "condition",
                ],
                name="unique_stand_metric",
            )
        ]


TStand = Type[Stand]
TStandMetric = Type[StandMetric]
