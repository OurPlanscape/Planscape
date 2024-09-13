from django_filters import rest_framework as filters
from planscape.filters import CharArrayFilter
from projects.models import Project


class ProjectFilterSet(filters.FilterSet):
    capabilities = CharArrayFilter(
        lookup_expr="contains",
        help_text="Capabilities. Multiple values may be separated by commas.",
    )

    name = filters.CharFilter(help_text="Project's name.")

    display_name = filters.CharFilter(help_text="Project's display name.")

    class Meta:
        model = Project
        fields = {
            "name": ["exact", "icontains"],
            "display_name": ["exact", "icontains"],
        }
