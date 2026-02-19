from typing import Any, Optional

from django.contrib.gis import forms as gis_forms
from django.template.loader import render_to_string


class ReadOnlyOSMGeometryWidget(gis_forms.OSMWidget):
    """OSM widget rendered through project templates with read-only marker."""

    template_name = "admin/widgets/readonly_osm_geometry.html"

    def __init__(self, attrs: Optional[dict[str, Any]] = None):
        widget_attrs = dict(attrs or {})
        widget_attrs["data-readonly-geom"] = "1"
        super().__init__(attrs=widget_attrs)

    def render(self, name, value, attrs=None, renderer=None):
        context = self.get_context(name, value, attrs)
        return render_to_string(self.template_name, context)
