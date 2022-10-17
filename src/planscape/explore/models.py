from django.contrib.gis.db import models


class Marker(models.Model):
    """A marker with name and location."""

    name:models.CharField = models.CharField(max_length=255)
    location = models.PointField()

    def __str__(self):
        """Return string representation."""
        return self.name

class TCSI_HUC12(models.Model):
    objectid:models.BigIntegerField = models.BigIntegerField()
    tnmid:models.CharField       = models.CharField(max_length=40)
    metasource:models.CharField  = models.CharField(max_length=40, null=True)
    sourcedata:models.CharField  = models.CharField(max_length=100, null=True)
    sourceorig:models.CharField  = models.CharField(max_length=130, null=True)
    sourcefeat:models.CharField  = models.CharField(max_length=40, null=True)
    loaddate:models.DateField    = models.DateField()
    noncontrib:models.FloatField = models.FloatField()
    noncontr_1:models.FloatField = models.FloatField()
    areasqkm:models.FloatField   = models.FloatField()
    areaacres:models.FloatField  = models.FloatField()
    gnis_id:models.BigIntegerField= models.BigIntegerField()
    name:models.CharField        = models.CharField(max_length=120)
    states:models.CharField      = models.CharField(max_length=50)
    huc12:models.CharField       = models.CharField(max_length=12)
    hutype:models.CharField      = models.CharField(max_length=254)
    humod:models.CharField       = models.CharField(max_length=30)
    tohuc:models.CharField       = models.CharField(max_length=16)
    shape_leng:models.FloatField = models.FloatField()
    shape_area:models.FloatField = models.FloatField()
    hectares:models.FloatField   = models.FloatField()
    geom                         = models.MultiPolygonField(srid=4269)

