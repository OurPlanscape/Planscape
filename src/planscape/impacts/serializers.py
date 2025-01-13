from impacts.models import (
    AVAILABLE_YEARS,
    ImpactVariable,
    ProjectAreaTreatmentResult,
    TreatmentPlan,
    TreatmentPlanNote,
    TreatmentPrescription,
    TreatmentPrescriptionAction,
)
from planning.models import ProjectArea
from planning.services import get_acreage
from rest_framework import serializers
from rest_framework.relations import PrimaryKeyRelatedField
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
    creator_name = serializers.SerializerMethodField(
        help_text="Name of the Creator of the Treatment Plan."
    )

    def get_creator_name(self, instance):
        return instance.created_by.get_full_name()

    class Meta:
        model = TreatmentPlan
        fields = (
            "id",
            "created_at",
            "created_by",
            "creator_name",
            "updated_at",
            "scenario",
            "name",
            "status",
        )


class TreatmentPlanListSerializer(serializers.ModelSerializer):
    creator_name = serializers.SerializerMethodField(
        help_text="Name of the Creator of the Treatment Plan."
    )

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
    project_area = TxPrescriptionProjectAreaSerializer(help_text="Project Area.")
    area_acres = serializers.SerializerMethodField(help_text="Area in acres.")

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
        queryset=TreatmentPlan.objects.all(), help_text="Treatment Plan ID."
    )

    project_area = PrimaryKeyRelatedField(
        queryset=ProjectArea.objects.all(), help_text="Project Area ID."
    )

    action = serializers.ChoiceField(
        choices=TreatmentPrescriptionAction.choices, help_text="Action choice text."
    )

    stands = serializers.PrimaryKeyRelatedField(
        queryset=Stand.objects.all(), many=True, help_text="Stands IDs."
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
        child=serializers.IntegerField(), allow_empty=False, help_text="Stands IDs."
    )


class TreatmentPrescriptionBatchDeleteResponseSerializer(serializers.Serializer):
    result = serializers.ListField(
        child=serializers.IntegerField(), help_text="Deleted stands IDs."
    )


class SummarySerializer(serializers.Serializer):
    project_area = serializers.PrimaryKeyRelatedField(
        queryset=ProjectArea.objects.all(), required=False, help_text="Project Area ID."
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


class TreatmentResultSerializer(serializers.Serializer):
    variables = serializers.ListField(
        child=serializers.ChoiceField(
            choices=ImpactVariable.choices,
        ),
        help_text="Impact Variables.",
        required=True,
    )
    actions = serializers.ListField(
        child=serializers.ChoiceField(
            choices=TreatmentPrescriptionAction.choices,
        ),
        help_text="Actions.",
        required=False,
    )
    project_areas = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(
            queryset=ProjectArea.objects.all(),
            required=False,
            help_text="Project Area ID.",
        ),
        help_text="Impact Variables.",
        required=False,
    )

    def validate_project_areas(self, project_areas):
        treatment_plan = self.context.get("treatment_plan", None) or None

        pa_scenario_ids = set([pa.scenario.pk for pa in project_areas])
        if not treatment_plan or treatment_plan.scenario.pk not in pa_scenario_ids:
            raise serializers.ValidationError(
                "Project Area does not belong to the same Scenario as Treatment Plan."
            )

        return project_areas


# serializers used only for documentation
class OutputPrescriptionSummarySerializer(serializers.Serializer):
    action = serializers.CharField(help_text="Action for Prescription.")
    type = serializers.CharField(help_text="Type of Prescription.")
    area_acres = serializers.FloatField(help_text="Area in Acres.")
    treated_stand_count = serializers.IntegerField(help_text="Total of treated stands.")


class OutputProjectAreaSummarySerializer(serializers.Serializer):
    project_area_id = serializers.IntegerField(help_text="Project Area ID.")
    project_area_name = serializers.CharField(help_text="Project Area Name.")
    total_stand_count = serializers.IntegerField(help_text="Total of stands.")
    prescriptions = serializers.ListField(
        child=OutputPrescriptionSummarySerializer(), help_text="Prescriptions."
    )


class OutputSummarySerializer(serializers.Serializer):
    planning_area_id = serializers.IntegerField(help_text="Planning Area ID.")
    planning_area_name = serializers.CharField(help_text="Planning Area Name.")
    scenario_id = serializers.IntegerField(help_text="Scenario ID.")
    scenario_name = serializers.CharField(help_text="Scenario Name.")
    treatment_plan_id = serializers.IntegerField(help_text="Treatment Plan ID.")
    treatment_plan_name = serializers.CharField(help_text="Treatment Plan Name.")
    project_areas = serializers.ListSerializer(
        child=OutputProjectAreaSummarySerializer(), help_text="Project Areas."
    )


class DataLayerImpactsModuleSerializer(serializers.Serializer):
    """Serializer used to describe and validate part of the
    `modules` field in the `DataLayerMetadataSerializer`.

    Ideally, we would be able to dynamically import these
    serializers that describes the participation of a datalayer
    in a planscape module and validate this on the fly.
    """

    baseline = serializers.BooleanField(
        required=True,
    )

    variable = serializers.ChoiceField(
        choices=ImpactVariable.choices,
        required=True,
    )

    year = serializers.ChoiceField(
        choices=[
            (
                year,
                str(year),
            )
            for year in AVAILABLE_YEARS
        ],
        required=True,
    )

    action = serializers.ChoiceField(
        choices=TreatmentPrescriptionAction.choices,
        required=True,
        allow_null=True,
    )

    def validate(self, attrs):
        baseline = attrs.get("baseline", False) or False
        action = attrs.get("action", None) or None
        if not baseline and not action:
            raise serializers.ValidationError(
                "You must specify action if `baseline` is False."
            )

        if baseline and action:
            raise serializers.ValidationError(
                "The fields `baseline` and `action` are mutually exclusive."
            )

        return super().validate(attrs=attrs)


class TreatmentResultsPlotSerializer(serializers.Serializer):
    project_areas = serializers.ListField(
        child=serializers.IntegerField(), help_text="Project Areas IDs."
    )
    years = serializers.ListField(
        child=serializers.IntegerField(), help_text="Years in sequence."
    )
    values = serializers.ListField(
        child=serializers.ListField(
            child=serializers.IntegerField(), help_text="Value ordered by metric."
        ),
        help_text="Values ordered by years.",
    )
    metrics = serializers.ListField(
        child=serializers.CharField(max_length=20), help_text="Metrics."
    )


class StandQuerySerializer(serializers.Serializer):
    stand_id = serializers.PrimaryKeyRelatedField(
        queryset=Stand.objects.all(), required=True
    )


class TreatmentPlanNoteSerializer(serializers.ModelSerializer):
    class Meta:
        fields = (
            "id",
            "created_at",
            "updated_at",
            "content",
            "treatment_plan",
            "user_id",
            "user_name",
        )
        model = TreatmentPlanNote

class TreatmentPlanNoteListSerializer(serializers.ModelSerializer):
    can_delete = serializers.SerializerMethodField()

    def get_can_delete(self, obj):
        user = self.context["request"].user
        if user:
            return (
                (user == obj.user)
                or (user == obj.treatment_plan.scenario.planning_area.user)
                or PlanningAreaPermission.can_remove(
                    user, obj.treatment_plan.scenario.planning_area
                )
            )

    class Meta:
        fields = (
            "id",
            "created_at",
            "updated_at",
            "content",
            "treatment_plan",
            "user_id",
            "user_name",
            "can_delete",
        )
        model = TreatmentPlanNote

class TreatmentPlanNoteCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TreatmentPlanNote
        fields = ["content"]

    def create(self, validated_data):
        treatment_plan_id = self.context["view"].kwargs.get("tx_plan_pk")
        try:
            treatment_plan = TreatmentPlan.objects.get(id=tx_plan_pk)
        except TreatmentPlan.DoesNotExist:
            raise serializers.ValidationError("Invalid tx_plan_pk")
        user = self.context["request"].user
        validated_data["treatment_plan"] = treatment_plan
        validated_data["user"] = user
        return super().create(validated_data)