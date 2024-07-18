from django_filters import rest_framework as filters
from django.db.models import F, Func, Value, ExpressionWrapper, FloatField
from django.contrib.gis.db.models.functions import Area, Transform
from django.conf import settings
from planning.models import PlanningArea, Scenario, RegionChoices
from rest_framework.filters import OrderingFilter
from django.db.models.functions import Coalesce
from django.db.models import Max


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


class PlanningAreaOrderingFilter(OrderingFilter):
    def filter_queryset(self, request, queryset, view):
        ordering = self.get_ordering(request, queryset, view)

        if ordering:
            for order in ordering:
                reverse = order.startswith("-")
                field_name = order.lstrip("-")

                if field_name == "creator":
                    direction = "-" if reverse else ""
                    queryset = queryset.annotate(
                        creator=Func(
                            F("user__first_name"),
                            Value(" "),
                            F("user__last_name"),
                            function="CONCAT",
                        )
                    ).order_by(f"{direction}creator")

                if field_name == "area_acres":
                    direction = "-" if reverse else ""
                    queryset = queryset.annotate(
                        area_acres=ExpressionWrapper(
                            Area(Transform(F("geometry"), settings.AREA_SRID)),
                            output_field=FloatField(),
                        )
                        * settings.CONVERSION_SQM_ACRES
                    ).order_by(f"{direction}area_acres")

                if field_name == "latest_updated":
                    direction = "-" if reverse else ""
                    queryset = queryset.annotate(
                        latest_updated=Coalesce(
                            Max("scenarios__updated_at"), "updated_at"
                        )
                    ).order_by(f"{direction}latest_updated")

        return super().filter_queryset(request, queryset, view)


class ScenarioFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr="icontains")

    class Meta:
        model = Scenario
        fields = ["name"]


class ScenarioOrderingFilter(OrderingFilter):
    def filter_queryset(self, request, queryset, view):
        ordering_dict = {
            "budget": "configuration__max_budget",
            "acres": "configuration__max_treatment_area_ratio",
            "completed_at": "results__completed_at",
        }
        ordering = self.get_ordering(request, queryset, view)
        if not ordering:
            return super().filter_queryset(request, queryset, view)

        def get_custom_ordering(order):
            direction = "-" if order.startswith("-") else ""
            field = order.lstrip("-")
            return f"{direction}{ordering_dict.get(field, field)}"

        custom_ordering = map(get_custom_ordering, ordering)
        return queryset.order_by(*custom_ordering)
