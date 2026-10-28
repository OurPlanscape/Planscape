import json
from typing import Any, Optional

from django.contrib.gis import forms as gis_forms
from django.template.loader import render_to_string


class ReadOnlyOSMGeometryWidget(gis_forms.OSMWidget):
    """OSM widget rendered through project templates with read-only marker."""

    template_name = "admin/widgets/readonly_osm_geometry.html"

    def __init__(self, attrs: Optional[dict[str, Any]] = None):
        super().__init__(attrs=dict(attrs or {}))
        self.geometry_url: str = ""

    def format_value(self, value):
        return None

    def get_context(self, name, value, attrs):
        context = super().get_context(name, None, attrs)
        widget = context["widget"]
        widget_attrs = widget["attrs"]
        widget["geometry_url"] = self.geometry_url
        widget["map_options_json"] = json.dumps(
            {
                "geom_name": widget_attrs["geom_name"],
                "id": widget_attrs["id"],
                "map_id": f"{widget_attrs['id']}_map",
                "map_srid": widget_attrs["map_srid"],
                "name": widget["name"],
                "default_lon": widget_attrs["default_lon"],
                "default_lat": widget_attrs["default_lat"],
                "default_zoom": widget_attrs["default_zoom"],
            }
        )
        return context

    def render(self, name, value, attrs=None, renderer=None):
        context = self.get_context(name, value, attrs)
        return render_to_string(self.template_name, context)
