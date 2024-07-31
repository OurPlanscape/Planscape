from rest_framework import serializers

from core.fields import UUIDRelatedField
from impacts.models import (
    TreatmentPlan,
    TreatmentPrescription,
    TreatmentPrescriptionType,
)
from planning.models import ProjectArea, Scenario
from planning.services import get_acreage
from stands.models import Stand, area_from_size


class TxPrescriptionProjectAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProjectArea
        fields = (
            "id",
            "uuid",
            "name",
        )


class CreateTreatmentPlanSerializer(serializers.ModelSerializer):
    created_by = serializers.HiddenField(
        default=serializers.CurrentUserDefault(),
    )

    class Meta:
        model = TreatmentPlan
        fields = (
            "created_by",
            "scenario",
            "name",
        )


class TreatmentPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = TreatmentPlan
        fields = (
            "id",
            "uuid",
            "created_at",
            "created_by",
            "updated_at",
            "scenario",
            "name",
            "status",
        )


class TreatmentPlanListSerializer(serializers.ModelSerializer):
    creator_name = serializers.SerializerMethodField()

    def get_creator_name(self, instance):
        return instance.created_by.get_full_name()

    class Meta:
        model = TreatmentPlan
        fields = (
            "id",
            "uuid",
            "created_at",
            "creator_name",
            "updated_at",
            "scenario",
            "name",
            "status",
        )


class TreatmentPlanUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TreatmentPlan
        fields = ["name"]


class TreatmentPrescriptionSerializer(serializers.ModelSerializer):
    project_area = TxPrescriptionProjectAreaSerializer()
    area_acres = serializers.SerializerMethodField()

    def get_area_acres(self, instance: TreatmentPrescription) -> float:
        # this path is much faster
        if instance.stand:
            return area_from_size(instance.stand.size)

        return get_acreage(instance.geometry)

    class Meta:
        model = TreatmentPrescription
        fields = (
            "id",
            "uuid",
            "created_at",
            "created_by",
            "updated_at",
            "updated_by",
            "treatment_plan",
            "project_area",
            "stand",
            "action",
            "geometry",
            "area_acres",
        )


class TreamentPrescriptionUpsertSerializer(serializers.Serializer):
    created_by = serializers.HiddenField(
        default=serializers.CurrentUserDefault(),
    )

    treatment_plan = UUIDRelatedField(
        uuid_field="uuid",
        queryset=TreatmentPlan.objects.all(),
    )

    project_area = UUIDRelatedField(
        uuid_field="uuid",
        queryset=ProjectArea.objects.all(),
    )

    action = serializers.ChoiceField(choices=TreatmentPrescriptionType.choices)

    stands = serializers.PrimaryKeyRelatedField(
        queryset=Stand.objects.all(),
        many=True,
    )


class TreatmentPrescriptionListSerializer(TreatmentPrescriptionSerializer):
    class Meta:
        model = TreatmentPrescription
        fields = (
            "id",
            "uuid",
            "created_at",
            "created_by",
            "updated_at",
            "project_area",
            "action",
            "stand",
            "area_acres",
        )
