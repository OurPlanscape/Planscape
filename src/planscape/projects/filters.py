from django_filters import rest_framework as filters
from planscape.filters import CharArrayFilter
from projects.models import Project


class ProjectFilterSet(filters.FilterSet):
    capabilities = CharArrayFilter(lookup_expr="contains")

    class Meta:
        model = Project
        fields = {
            "name": ["exact", "icontains"],
            "display_name": ["exact", "icontains"],
        }
