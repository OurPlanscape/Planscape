from django.contrib.gis.db import models

from core.models import CreatedAtMixin
from conditions.models import Condition


class StandSizeChoices(models.TextChoices):
    SMALL = "SMALL", "Small"
    MEDIUM = "MEDIUM", "Medium"
    LARGE = "LARGE", "Large"


HEX_LENGTH = {
    StandSizeChoices.LARGE: 877.38267558,
    # FIXME: still need to calculate these below!
    StandSizeChoices.MEDIUM: 500,
    StandSizeChoices.SMALL: 250,
}
STAND_SIZE_LENGTH = {
    # 200 ha / 500ac
    StandSizeChoices.LARGE: 877.38267558,
    # 40 ha / 100ac
    StandSizeChoices.MEDIUM: 392.377463,
    # 4ha / 10ac
    StandSizeChoices.SMALL: 124.0806483,
}


def length_from_size(size):
    return StandSizeChoices.STAND_SIZE_LENGTH[size]


class Stand(CreatedAtMixin, models.Model):
    size = models.CharField(
        choices=StandSizeChoices.choices,
        max_length=16,
    )

    geometry = models.PolygonField(srid=4269, spatial_index=True)

    area_m2 = models.FloatField()

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
