from django.contrib.gis import admin
from leaflet.admin import LeafletGeoAdmin

from .models import TCSI_HUC12


@admin.register(TCSI_HUC12)
class TCSI_HUC12Admin(LeafletGeoAdmin):
    list_display = ('name', 'areaacres')