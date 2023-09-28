from django.contrib.gis.db import models

from core.models import CreatedAtMixin
from conditions.models import Condition


class StandSizeChoices(models.TextChoices):
    SMALL = "SMALL", "Small"
    MEDIUM = "MEDIUM", "Medium"
    LARGE = "LARGE", "Large"

    STAND_SIZE_LENGTH = {
        LARGE: 877.38267558,
        MEDIUM: 392.377463,
        SMALL: 124.0806483,
    }

    @classmethod
    def length_from_size(cls, size):
        return cls.STAND_SIZE_LENGTH[size]


HEX_LENGTH = {
    StandSizeChoices.LARGE: 877.38267558,
    # FIXME: still need to calculate these below!
    StandSizeChoices.MEDIUM: 500,
    StandSizeChoices.SMALL: 250,
}


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
