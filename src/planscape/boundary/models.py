from django.contrib.gis.db import models


class Boundary(models.Model):
    """A Boundary object is a collection of polygons with a name."""

    boundary_name: models.CharField = models.CharField(max_length=120)
    # Optional fields for Boundary
    display_name: models.CharField = models.CharField(max_length=120, null=True)
    region_name: models.CharField = models.CharField(max_length=120, null=True)


class BoundaryDetails(models.Model):
    """
    A BoundaryDetails Model object is a single polygon, referencing the Boundary
    object, with additional metadata.
    """

    boundary = models.ForeignKey(Boundary, on_delete=models.CASCADE)  # type: ignore
    geometry = models.MultiPolygonField(srid=4269, null=True)
    # Optional fields for boundary areas
    objectid: models.BigIntegerField = models.BigIntegerField(null=True)
    shape_name: models.CharField = models.CharField(max_length=120, null=True)
    states: models.CharField = models.CharField(max_length=50, null=True)
    acres: models.FloatField = models.FloatField(null=True)
    hectares: models.FloatField = models.FloatField(null=True)
