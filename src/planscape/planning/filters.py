from django_filters import rest_framework as filters
from planning.models import PlanningArea, Scenario, RegionChoices


class PlanningAreaFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr="icontains")
    region_name = filters.MultipleChoiceFilter(
        choices=RegionChoices.choices,
    )

    class Meta:
        model = PlanningArea
        fields = ["name", "region_name"]


class ScenarioFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr="icontains")

    class Meta:
        model = Scenario
        fields = ["name"]
