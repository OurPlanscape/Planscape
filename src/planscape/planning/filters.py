from django_filters import rest_framework as filters
from django.db.models import F, Func, Value, ExpressionWrapper, FloatField
from django.contrib.gis.db.models.functions import Area, Transform
from django.conf import settings
from planning.models import PlanningArea, Scenario, RegionChoices
from rest_framework.filters import OrderingFilter


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

                if field_name == "full_name":
                    direction = "-" if reverse else ""
                    queryset = queryset.annotate(
                        full_name=Func(
                            F("user__first_name"),
                            Value(" "),
                            F("user__last_name"),
                            function="CONCAT",
                        )
                    ).order_by(f"{direction}full_name")

                if field_name == "area_acres":
                    direction = "-" if reverse else ""
                    queryset = queryset.annotate(
                        area_acres=ExpressionWrapper(
                            Area(Transform(F("geometry"), settings.AREA_SRID)),
                            output_field=FloatField(),
                        )
                        * settings.CONVERSION_SQM_ACRES
                    ).order_by(f"{direction}area_acres")

        return super().filter_queryset(request, queryset, view)


class ScenarioFilter(filters.FilterSet):
    name = filters.CharFilter(lookup_expr="icontains")

    class Meta:
        model = Scenario
        fields = ["name"]
