from datasets.models import DataLayer, Dataset
from rest_framework import serializers
from datasets.serializers import BrowseDataLayerSerializer
from core.flags import feature_enabled

class OptionDataLayerSerializer(serializers.ModelSerializer):
    class Meta:
        fields = (
            "id",
            "name",
        )
        model = DataLayer


class OptionThresholdsSerializer(serializers.Serializer):
    slope = OptionDataLayerSerializer()
    distance_from_roads = OptionDataLayerSerializer()


class ForsysOptionsSerializer(serializers.Serializer):
    inclusions = serializers.ListField(child=OptionDataLayerSerializer())
    if feature_enabled("SCENARIO_CONFIG_UI"):
        exclusions = serializers.ListField(child=BrowseDataLayerSerializer())
    else:
        exclusions = serializers.ListField(child=OptionDataLayerSerializer())
    thresholds = OptionThresholdsSerializer()


class DatasetMapOptionsSerializer(serializers.ModelSerializer):
    organization = serializers.CharField(source="organization.name")

    class Meta:
        model = Dataset
        fields = (
            "id",
            "organization",
            "name",
            "preferred_display_type",
            "selection_type",
        )


class MapOptionsSerializer(serializers.Serializer):
    main_datasets = serializers.ListField(child=DatasetMapOptionsSerializer())
    base_datasets = serializers.ListField(child=DatasetMapOptionsSerializer())


OPTIONS_SERIALIZERS = {
    "forsys": ForsysOptionsSerializer,
    "map": MapOptionsSerializer,
}


class ModuleSerializer(serializers.Serializer):
    def get_options_serializer(self, module_name: str) -> serializers.Serializer:
        return OPTIONS_SERIALIZERS[module_name]()

    def __init__(self, *args, module_name: str, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["options"] = self.get_options_serializer(module_name)

    name = serializers.CharField()
    options = serializers.DictField()
