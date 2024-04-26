from django_filters import rest_framework as filters
from planning.models import PlanningArea, Scenario, RegionChoices


class PlanningAreaFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr="icontains")
    region_name = filters.CharFilter(field_name="region_name", lookup_expr="in")

    class Meta:
        model = PlanningArea
        fields = ["name", "region_name"]

    def filter_queryset(self, queryset):
        region_filter = self.data.get("region_name")
        if region_filter:
            regions = region_filter.split(",")
            queryset = queryset.filter(region_name__in=regions)
        return queryset


class ScenarioFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr="icontains")

    class Meta:
        model = Scenario
        fields = ["name"]
