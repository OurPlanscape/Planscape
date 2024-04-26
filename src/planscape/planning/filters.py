from django_filters import rest_framework as filters
from planning.models import PlanningArea, Scenario, RegionChoices


class PlanningAreaFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr="icontains")
    region_name = filters.CharFilter(field_name="region_name", lookup_expr="in")
    sortby = filters.CharFilter(method="filter_by_sortby")

    class Meta:
        model = PlanningArea
        fields = ["name", "region_name"]

    def filter_queryset(self, queryset):
        region_filter = self.data.get("region_name")
        name = self.data.get("name")
        mod_after = self.data.get("mod_after")
        mod_before = self.data.get("mod_before")
        if region_filter:
            regions = region_filter.split(",")
            queryset = queryset.filter(region_name__in=regions)
        if name:
            queryset = queryset.filter(name__icontains=name)
        if mod_after:
            queryset = queryset.filter(updated_at__gte=mod_after)
        if mod_before:
            queryset = queryset.filter(updated_at__lte=mod_before)
        return queryset


class ScenarioFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr="icontains")

    class Meta:
        model = Scenario
        fields = ["name"]
