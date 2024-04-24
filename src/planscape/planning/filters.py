from django_filters import rest_framework as filters
from planning.models import PlanningArea, Scenario, RegionChoices


class PlanningAreaFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr="icontains")
    region_name = filters.MultipleChoiceFilter(
        choices=RegionChoices.choices,
    )
    sortby = filters.CharFilter(method="filter_by_sortby")

    class Meta:
        model = PlanningArea
        fields = ["sortby", "name", "region_name"]

    def filter_by_sortby(self, queryset, field, value):
        if value == "scenario_count":
            queryset = queryset.order_by("scenario_count")
        if value == "name":
            queryset = queryset.order_by("name")
        return queryset


class ScenarioFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr="icontains")

    class Meta:
        model = Scenario
        fields = ["name"]
