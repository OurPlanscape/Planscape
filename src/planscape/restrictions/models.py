from django.contrib.gis.db import models


class Restriction(models.Model):
    name = models.CharField(max_length=512, null=True)

    type = models.CharField(max_length=128)

    geometry = models.MultiPolygonField(srid=4269)

    class Meta:
        indexes = [models.Index(fields=["type"], name="restriction_type_index")]
