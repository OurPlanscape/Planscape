from django.contrib.gis.db import models

from core.models import CreatedAtMixin
from conditions.models import Condition


class StandSizeChoices(models.TextChoices):
    SMALL = "FINE", "Fine"
    MEDIUM = "MEDIUM", "Medium"
    LARGE = "LARGE", "Large"


class Stand(CreatedAtMixin, models.Model):
    size = models.CharField(
        choices=StandSizeChoices.choices,
        max_length=16,
    )

    geometry = models.PolygonField(srid=4269, spatial_index=True)

    area_m2 = models.FloatField()

    area_ha = models.FloatField()

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
