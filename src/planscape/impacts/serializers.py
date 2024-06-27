from rest_framework import serializers

from core.fields import UUIDRelatedField
from impacts.models import TreatmentPlan
from planning.models import Scenario


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
    pass
