from typing import Type, Union

from conditions.models import Condition
from core.models import CreatedAtMixin
from datasets.models import DataLayer
from django.contrib.gis.db import models
from django.contrib.gis.db.models.functions import Centroid, Transform
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.db.models import QuerySet
from django_stubs_ext.db.models import TypedModelMeta


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

STAND_PIXELS = {
    # 200 ha / 500ac
    StandSizeChoices.LARGE: 3960,
    # 40 ha / 100ac
    StandSizeChoices.MEDIUM: 775,
    # 4ha / 10ac
    StandSizeChoices.SMALL: 77,
}


def length_from_size(size: StandSizeChoices) -> float:
    return STAND_LENGTH_METERS[size]


def area_from_size(size: StandSizeChoices) -> float:
    return STAND_AREA_ACRES[size]


def pixels_from_size(size: StandSizeChoices) -> int:
    return STAND_PIXELS[size]


class StandQuerySet(models.QuerySet):
    def with_webmercator(
        self,
    ):
        return self.annotate(webmercator=Transform("geometry", srid=3857))

    def within_polygon(
        self,
        geometry: Union[Polygon, MultiPolygon],
        size: StandSizeChoices,
    ) -> "QuerySet[Stand]":
        if not geometry.valid:
            raise ValueError("Invalid geometry")

        return (
            Stand.objects.filter(geometry__bboverlaps=geometry)
            .annotate(centroid=Centroid("geometry"))
            .filter(
                centroid__within=geometry,
                size=size,
            )
        )


class StandManager(models.Manager):
    pass


class Stand(CreatedAtMixin, models.Model):
    id: int
    size = models.CharField(
        choices=StandSizeChoices.choices,
        max_length=16,
        db_index=True,
    )

    geometry = models.PolygonField(srid=4269, spatial_index=True)

    area_m2 = models.FloatField()

    objects: StandManager = StandManager.from_queryset(StandQuerySet)()

    class Meta(TypedModelMeta):
        indexes = [
            models.Index(
                fields=[
                    "size",
                ],
                name="stand_size_index",
            )
        ]


class StandMetric(CreatedAtMixin, models.Model):
    id: int
    stand_id: int
    stand = models.ForeignKey(Stand, related_name="metrics", on_delete=models.CASCADE)

    condition = models.ForeignKey(
        Condition,
        related_name="metrics",
        on_delete=models.CASCADE,
        null=True,
    )

    datalayer = models.ForeignKey(
        DataLayer,
        related_name="metrics",
        on_delete=models.CASCADE,
        null=True,
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
                    "datalayer",
                ],
                name="unique_stand_metric",
            )
        ]


TStand = Type[Stand]
TStandMetric = Type[StandMetric]
TStandMetric = Type[StandMetric]
