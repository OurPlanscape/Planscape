from django_filters import rest_framework as filters
from django_filters import BaseInFilter, NumberFilter
from planning.models import PlanningArea, Scenario, RegionChoices


class NumberInFilter(BaseInFilter, NumberFilter):
    pass


class PlanningAreaFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr="icontains")
    region_name = filters.MultipleChoiceFilter(
        choices=RegionChoices.choices,
    )
    creator = NumberInFilter(field_name="user_id", lookup_expr="in")

    class Meta:
        model = PlanningArea
        fields = ["name", "region_name", "creator"]


class ScenarioFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr="icontains")

    class Meta:
        model = Scenario
        fields = ["name"]
