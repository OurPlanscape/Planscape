from rest_framework import serializers
from rest_framework.relations import PrimaryKeyRelatedField

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


class UpsertTreamentPrescriptionSerializer(serializers.Serializer):
    created_by = serializers.HiddenField(
        default=serializers.CurrentUserDefault(),
    )

    treatment_plan = PrimaryKeyRelatedField(
        queryset=TreatmentPlan.objects.all(),
    )

    project_area = PrimaryKeyRelatedField(
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
            "created_at",
            "created_by",
            "updated_at",
            "project_area",
            "action",
            "stand",
            "area_acres",
        )


class TreatmentPrescriptionBatchDeleteSerializer(serializers.Serializer):
    stand_ids = serializers.ListField(
        child=serializers.IntegerField(), allow_empty=False
    )


class SummarySerializer(serializers.Serializer):
    project_area = serializers.PrimaryKeyRelatedField(
        queryset=ProjectArea.objects.all(),
        required=False,
    )

    def validate_project_area(self, project_area):
        """
        Validates if the project area selected belongs to
        the same scenario as the treatment plan.
        """
        treatment_plan = self.context.get("treatment_plan", None) or None

        if project_area and treatment_plan:
            if treatment_plan.scenario.pk != project_area.scenario.pk:
                raise serializers.ValidationError(
                    "Project Area does not belong to the same Scenario as Treatment Plan."
                )

        return project_area


# serializers used only for documentation
class OutputPrescriptionSummarySerializer(serializers.Serializer):
    action = serializers.CharField()
    type = serializers.CharField()
    area_acres = serializers.FloatField()
    treated_stand_count = serializers.IntegerField()


class OutputProjectAreaSummarySerializer(serializers.Serializer):
    project_area_id = serializers.IntegerField()
    project_area_name = serializers.CharField()
    total_stand_count = serializers.IntegerField()
    prescriptions = serializers.ListField(child=OutputPrescriptionSummarySerializer())


class OutputSummarySerializer(serializers.Serializer):
    planning_area_id = serializers.IntegerField()
    planning_area_name = serializers.CharField()
    scenario_id = serializers.IntegerField()
    scenario_name = serializers.CharField()
    treatment_plan_id = serializers.IntegerField()
    treatment_plan_name = serializers.CharField()
    project_areas = serializers.ListSerializer(
        child=OutputProjectAreaSummarySerializer()
    )
