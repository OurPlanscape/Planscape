from datasets.models import DataLayer
from rest_framework import serializers


class OptionDataLayerSerializer(serializers.ModelSerializer):
    class Meta:
        fields = (
            "id",
            "name",
            "info",
        )
        model = DataLayer


class OptionThresholdsSerializer(serializers.Serializer):
    slope = OptionDataLayerSerializer()
    distance_from_roads = OptionDataLayerSerializer()


class ForsysOptionsSerializer(serializers.Serializer):
    inclusions = serializers.ListField(child=OptionDataLayerSerializer())
    exclusions = serializers.ListField(child=OptionDataLayerSerializer())
    thresholds = OptionThresholdsSerializer()


OPTIONS_SERIALIZERS = {
    "forsys": ForsysOptionsSerializer,
}


class ModuleSerializer(serializers.Serializer):
    def get_options_serializer(self, module_name: str) -> serializers.Serializer:
        return OPTIONS_SERIALIZERS[module_name]()

    def __init__(self, *args, module_name: str, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["options"] = self.get_options_serializer(module_name)

    name = serializers.CharField()
