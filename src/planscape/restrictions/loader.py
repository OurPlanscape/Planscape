from typing import Any, Dict
from django.contrib.gis.utils import LayerMapping
from django.contrib.gis.geos import GEOSGeometry
from planscape.exceptions import InvalidGeometry
from restrictions.models import Restriction

MAPPINGS = {
    "WILDERNESS_AREA": {"name": "WILDERNE_1", "geometry": "MULTIPOLYGON"},
    "TRIBAL_LANDS": {"name": "Name", "geometry": "MULTIPOLYGON"},
    "PRIVATE_LANDS": {"geometry": "MULTIPOLYGON"},
    "NATIONAL_FORESTS": {"name": "FORESTNAME", "geometry": "MULTIPOLYGON"},
    "NATIONAL_PARKS": {"name": "UNIT_NAME", "geometry": "MULTIPOLYGON"},
    "STATE_PARKS": {"name": "UNITNAME", "geometry": "MULTIPOLYGON"},
}


class CustomLayerMapping(LayerMapping):
    def __init__(self, *args, **kwargs):
        self.custom_data = kwargs.pop("custom_data", {})
        self.raise_on_bad_geom = kwargs.pop("raise_on_bad_geom", False)
        super(CustomLayerMapping, self).__init__(*args, **kwargs)

    def verify_geom(self, geom: Any, model_field: Any) -> str:
        wkt = super().verify_geom(geom, model_field)
        if not self.raise_on_bad_geom:
            return wkt

        geom = GEOSGeometry(wkt)
        if not geom.valid:
            raise InvalidGeometry(f"Invalid geometry {wkt}")
        return wkt

    def feature_kwargs(self, feat) -> Dict[str, Any]:
        kwargs = super(CustomLayerMapping, self).feature_kwargs(feat)
        kwargs.update(self.custom_data)
        return kwargs


def load_data(
    path,
    mapping,
    layer_type,
):
    lm = CustomLayerMapping(
        model=Restriction,
        data=path,
        mapping=mapping,
        custom_data={"type": layer_type},
        transform=True,
    )
    lm.save(strict=True, verbose=True)
