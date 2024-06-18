from django_filters import rest_framework as filters
from planning.models import PlanningArea, Scenario, RegionChoices


class MultipleCreatorFilter(filters.CharFilter):
    def filter(self, queryset, value):
        if not value:
            return queryset
        request = self.parent.request
        creator_ids = request.query_params.getlist(self.field_name)
        return queryset.filter(user_id__in=creator_ids)


class PlanningAreaFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr="icontains")
    region_name = filters.MultipleChoiceFilter(
        choices=RegionChoices.choices,
    )
    creator = MultipleCreatorFilter(field_name="creator")

    class Meta:
        model = PlanningArea
        fields = ["name", "region_name", "creator"]


class ScenarioFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr="icontains")

    class Meta:
        model = Scenario
        fields = ["name"]
