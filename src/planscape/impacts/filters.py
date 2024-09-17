from typing import Optional
from django_filters import rest_framework as filters
from django.db.models import QuerySet
from rest_framework.request import Request
from impacts.models import TreatmentPlan, TreatmentPlanStatus
from planning.models import Scenario


def get_scenarios_for_filter(request: Optional[Request]) -> QuerySet:
    if not request:
        return Scenario.objects.none()

    return Scenario.objects.list_by_user(request.user)


class TreatmentPlanFilterSet(filters.FilterSet):
    scenario = filters.ModelChoiceFilter(
        field_name="scenario",
        queryset=get_scenarios_for_filter,
        help_text="Scenario ID.",
    )
    name = filters.CharFilter(
        field_name="name",
        lookup_expr="icontains",
        help_text="Treatment Name.",
    )
    status = filters.ChoiceFilter(
        choices=TreatmentPlanStatus.choices,
        field_name="status",
        lookup_expr="iexact",
        help_text="Treatment status choice (exact).",
    )

    class Meta:
        model = TreatmentPlan
        fields = (
            "scenario",
            "name",
            "status",
        )
