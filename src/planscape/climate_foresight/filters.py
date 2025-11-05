from typing import Optional

from django.db.models import QuerySet, Case, When, IntegerField, Q
from django_filters import rest_framework as filters
from rest_framework.request import Request

from climate_foresight.models import ClimateForesightPillar, ClimateForesightRun
from planning.models import PlanningArea


def get_planning_areas_for_filter(
    request: Optional[Request],
) -> "QuerySet[PlanningArea]":
    if request is None:
        return PlanningArea.objects.none()

    return PlanningArea.objects.list_by_user(request.user)


def get_runs_for_filter(request: Optional[Request]) -> "QuerySet[ClimateForesightRun]":
    if request is None:
        return ClimateForesightRun.objects.none()

    return ClimateForesightRun.objects.list_by_user(request.user)


class ClimateForesightRunFilterSet(filters.FilterSet):
    planning_area = filters.ModelChoiceFilter(
        queryset=get_planning_areas_for_filter,
        field_name="planning_area",
        help_text="planning area id",
    )

    class Meta:
        model = ClimateForesightRun
        fields = ["planning_area"]


class ClimateForesightPillarFilterSet(filters.FilterSet):
    run = filters.ModelChoiceFilter(
        queryset=get_runs_for_filter,
        field_name="run",
        help_text="run id",
        method="filter_by_run",
    )

    class Meta:
        model = ClimateForesightPillar
        fields = ["run"]

    def filter_by_run(self, queryset, name, value):
        """
        Filter pillars by run with custom ordering.
        - Shows both global pillars (run=None) and custom pillars for the specified run
        - Orders custom pillars first, then global pillars, both by order field
        """
        if value:
            return queryset.filter(Q(run__isnull=True) | Q(run=value)).order_by(
                Case(
                    When(run__isnull=True, then=1),
                    When(run__isnull=False, then=0),
                    output_field=IntegerField(),
                ),
                "order",
                "name",
            )
        return queryset
