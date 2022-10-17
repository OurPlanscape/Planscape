"""Markers admin."""

from django.contrib.gis import admin
from leaflet.admin import LeafletGeoAdmin

from .models import Marker,TCSI_HUC12

@admin.register(Marker)
class MarkerAdmin(admin.OSMGeoAdmin):
    """Marker admin."""

    list_display = ("name", "location")

@admin.register(TCSI_HUC12)
class TCSI_HUC12Admin(LeafletGeoAdmin):
    list_display = ('name', 'areaacres')