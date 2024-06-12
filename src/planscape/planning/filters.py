from django_filters import rest_framework as filters
from planning.models import PlanningArea, Scenario, RegionChoices
from rest_framework.filters import OrderingFilter
from planning.services import get_acreage


class PlanningAreaFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr="icontains")
    region_name = filters.MultipleChoiceFilter(
        choices=RegionChoices.choices,
    )

    class Meta:
        model = PlanningArea
        fields = ["name", "region_name"]


class PlanningAreaOrderingFilter(OrderingFilter):
    def filter_queryset(self, request, queryset, view):
        ordering = self.get_ordering(request, queryset, view)
        if ordering:
            for order in ordering:
                reverse = order.startswith("-")
                field_name = order.lstrip("-")

                if field_name == "creator":
                    queryset = sorted(
                        queryset,
                        key=lambda instance: instance.user.get_full_name(),
                        reverse=reverse,
                    )
                    return queryset

                if field_name == "area_acres":
                    queryset = sorted(
                        queryset,
                        key=lambda instance: get_acreage(instance.geometry),
                        reverse=reverse,
                    )
                    return queryset
        return super().filter_queryset(request, queryset, view)


class ScenarioFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr="icontains")

    class Meta:
        model = Scenario
        fields = ["name"]
