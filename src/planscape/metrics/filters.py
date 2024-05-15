from django_filters import rest_framework as filters
from metrics.models import Category, Metric, MetricCapabilities
from organizations.models import Organization
from planscape.filters import CharArrayFilter
from projects.models import Project, ProjectVisibility


class MetricFilterSet(filters.FilterSet):
    organization = filters.ModelChoiceFilter(
        queryset=Organization.objects.all(),
        field_name="project__organization__uuid",
    )

    project = filters.ModelChoiceFilter(
        queryset=Project.objects.filter(visibility=ProjectVisibility.PUBLIC),
        field_name="project__uuid",
    )

    category = filters.ModelChoiceFilter(queryset=Category.objects.all())

    capabilities = CharArrayFilter(lookup_expr="contains")

    class Meta:
        model = Metric
        fields = {
            "name": ["exact", "contains"],
            "display_name": ["exact", "contains"],
        }
