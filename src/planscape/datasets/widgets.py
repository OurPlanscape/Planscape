from django.contrib.gis import forms as gis_forms


class ReadOnlyOSMGeometryWidget(gis_forms.OSMWidget):
    template_name = "datasets/widgets/readonly_osm_geometry.html"

    def __init__(self, attrs=None):
        attrs = attrs or {}
        attrs["data-readonly-geom"] = "1"
        super().__init__(attrs=attrs)
