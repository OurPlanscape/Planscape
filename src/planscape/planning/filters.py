from django_filters import rest_framework as filters
from planning.models import PlanningArea, Scenario, RegionChoices


class MultipleValueFilter(filters.CharFilter):
    def __init__(self, given_param, field_name, *args, **kwargs):
        self.given_param = given_param
        super(MultipleValueFilter, self).__init__(
            field_name=field_name, *args, **kwargs
        )

    def filter(self, queryset, value):
        if not value:
            return queryset
        request = self.parent.request
        # getlist grabs all values associated with this param
        all_values = request.query_params.getlist(self.given_param)
        filter_expr = {f"{self.field_name}__in": all_values}
        return queryset.filter(**filter_expr)


class PlanningAreaFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr="icontains")
    region_name = filters.MultipleChoiceFilter(
        choices=RegionChoices.choices,
    )
    creator = MultipleValueFilter(field_name="user_id", given_param="creator")

    class Meta:
        model = PlanningArea
        fields = ["name", "region_name", "creator"]


class ScenarioFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr="icontains")

    class Meta:
        model = Scenario
        fields = ["name"]
