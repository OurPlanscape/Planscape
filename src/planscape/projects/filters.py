from django_filters import rest_framework as filters
from planscape.filters import CharArrayFilter
from projects.models import Project, ProjectCapabilities, ProjectVisibility


class ProjectFilterSet(filters.FilterSet):
    name = filters.CharFilter(lookup_expr="icontains")
    display_name = filters.CharFilter(lookup_expr="icontains")
    visibility = filters.MultipleChoiceFilter(
        choices=ProjectVisibility.choices,
    )
    capabilities = CharArrayFilter(
        choices=ProjectCapabilities.choices, lookup_expr="contains"
    )

    class Meta:
        model = Project
        fields = ["name", "display_name"]
