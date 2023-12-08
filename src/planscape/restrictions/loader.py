from django.contrib.gis.utils import LayerMapping
from restrictions.models import Restriction

MAPPINGS = {
    "WILDERNESS_AREA": {"name": "WILDERNE_1", "geometry": "MULTIPOLYGON"},
    "TRIBAL_LANDS": {"name": "Name", "geometry": "MULTIPOLYGON"},
    "PRIVATE_LANDS": {"geometry": "MULTIPOLYGON"},
    "NATIONAL_FORESTS": {"name": "", "geometry": "MULTIPOLYGON"},
    "NATIONAL_PARKS": {"name": "UNIT_NAME", "geometry": "MULTIPOLYGON"},
    "STATE_PARKS": {"name": "UNITNAME", "geometry": "MULTIPOLYGON"},
}


class CustomLayerMapping(LayerMapping):
    def __init__(self, *args, **kwargs):
        self.custom_data = kwargs.pop("custom_data", {})
        super(CustomLayerMapping, self).__init__(*args, **kwargs)

    def feature_kwargs(self, feature):
        kwargs = super(CustomLayerMapping, self).feature_kwargs(feature)
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
