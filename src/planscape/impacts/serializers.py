from rest_framework import serializers

from core.fields import UUIDRelatedField
from impacts.models import (
    TreatmentPlan,
    TreatmentPrescription,
    TreatmentPrescriptionType,
)
from planning.models import ProjectArea, Scenario
from stands.models import Stand


class CreateTreatmentPlanSerializer(serializers.Serializer):
    created_by = serializers.HiddenField(
        default=serializers.CurrentUserDefault(),
    )
    scenario = UUIDRelatedField(
        uuid_field="uuid",
        queryset=Scenario.objects.all(),
    )
    name = serializers.CharField()


class TreatmentPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = TreatmentPlan
        fields = (
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
            "uuid",
            "created_at",
            "creator_name",
            "updated_at",
            "scenario",
            "name",
            "status",
        )


class TreatmentPrescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TreatmentPrescription
        fields = (
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


class TreatmentPrescriptionListSerializer(serializers.ModelSerializer):
    class Meta:
        model = TreatmentPrescription
        fields = (
            "uuid",
            "created_at",
            "created_by",
            "updated_at",
            "action",
            "stand",
        )
