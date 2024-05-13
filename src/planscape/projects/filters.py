from django_filters import rest_framework as filters
from projects.models import Project, ProjectCapabilities, ProjectVisibility


class ProjectFilterSet(filters.FilterSet):
    name = filters.CharFilter(lookup_expr="icontains")
    display_name = filters.CharFilter(lookup_expr="icontains")
    visibility = filters.MultipleChoiceFilter(
        choices=ProjectVisibility.choices,
    )
    capabilities = filters.MultipleChoiceFilter(
        choices=ProjectCapabilities.choices,
    )

    class Meta:
        model = Project
        fields = ["name", "display_name"]
