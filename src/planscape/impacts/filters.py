from typing import Optional
from django_filters import rest_framework as filters
from django.db.models import QuerySet
from django.conf import settings
from rest_framework.request import Request
from impacts.models import TreatmentPlanStatus
from planning.models import Scenario


def get_scenarios_for_filter(request: Optional[Request]) -> QuerySet:
    if not request:
        return Scenario.objects.none()

    return Scenario.objects.list_by_user(request.user)


class TreatmentPlanFilterSet(filters.FilterSet):
    scenario = filters.ModelChoiceFilter(
        field_name="scenario",
        queryset=get_scenarios_for_filter,
    )
    name = filters.CharFilter(
        field_name="name",
        lookup_expr="icontains",
    )
    status = filters.ChoiceFilter(
        choices=TreatmentPlanStatus.choices,
        field_name="status",
        lookup_expr="iexact",
    )

    class Meta:
        model = Scenario
        fields = (
            "scenario",
            "name",
            "status",
        )
