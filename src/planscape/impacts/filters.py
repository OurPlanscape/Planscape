from typing import Optional
from django_filters import rest_framework as filters
from django.db.models import QuerySet
from rest_framework.request import Request
from impacts.models import (
    TreatmentPlan,
    TreatmentPlanStatus,
    ImpactVariable,
)
from planning.models import Scenario
from planning.filters import get_planning_areas_for_filter


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


class ProjectAreaTreatmentResultFilter(filters.FilterSet):
    variable = filters.MultipleChoiceFilter(
        choices=ImpactVariable.choices,
        field_name="variable",
        lookup_expr="iexact",
        help_text="Treatment result impact variable choice (exact).",
    )
    project_area = filters.ModelChoiceFilter(
        field_name="project_area",
        queryset=get_planning_areas_for_filter,
        help_text="Project Area ID.",
    )
