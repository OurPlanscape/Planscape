from core.fields import GeometryTypeField
from datasets.models import DataLayer, Dataset
from datasets.serializers import BrowseDataLayerSerializer
from organizations.models import Organization
from rest_framework import serializers


class OrganizationMapOptionsSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = (
            "id",
            "name",
        )


class DatasetMapOptionsSerializer(serializers.ModelSerializer):
    organization = OrganizationMapOptionsSerializer()

    class Meta:
        model = Dataset
        fields = (
            "id",
            "organization",
            "name",
            "preferred_display_type",
            "selection_type",
        )


class DatasetsOptionsSerializers(serializers.Serializer):
    main_datasets = serializers.ListField(child=DatasetMapOptionsSerializer())
    base_datasets = serializers.ListField(child=DatasetMapOptionsSerializer())


class BaseModuleOptionsSerializer(serializers.Serializer):
    datasets = DatasetsOptionsSerializers()


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


class ForsysOptionsSerializer(BaseModuleOptionsSerializer):
    inclusions = serializers.ListField(child=OptionDataLayerSerializer())
    exclusions = serializers.ListField(child=BrowseDataLayerSerializer())
    thresholds = OptionThresholdsSerializer()


class MapOptionsSerializer(BaseModuleOptionsSerializer):
    pass


class InputModuleSerializer(serializers.Serializer):
    geometry = GeometryTypeField(
        geometry_type="MultiPolygon",
        destination_srid=4269,
        coerce_multi=True,
        required=False,
    )

class BaseModuleSerializer(serializers.Serializer):
    name = serializers.CharField()
    options = BaseModuleOptionsSerializer()


class ForsysModuleSerializer(BaseModuleSerializer):
    options = ForsysOptionsSerializer()


class MapModuleSerializer(BaseModuleSerializer):
    options = MapOptionsSerializer()
