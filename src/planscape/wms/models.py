from django.contrib.gis.db import models


class Current(models.Model):
    geometry = models.RasterField(null=True)
    filename: models.TextField = models.TextField(null=True)

    class Meta:
        managed = False
        db_table = 'wms_current'
