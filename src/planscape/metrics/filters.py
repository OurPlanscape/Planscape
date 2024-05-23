from django_filters import rest_framework as filters
from metrics.models import Category, Metric
from organizations.models import Organization
from planscape.filters import CharArrayFilter
from projects.models import Project


class MetricFilterSet(filters.FilterSet):
    organization = filters.ModelChoiceFilter(
        queryset=Organization.objects.all(),
        field_name="project__organization",
        to_field_name="uuid",
    )

    project = filters.ModelChoiceFilter(
        queryset=Project.objects.all(),
        field_name="project",
        to_field_name="uuid",
    )

    category = filters.ModelChoiceFilter(queryset=Category.objects.all())

    capabilities = CharArrayFilter(lookup_expr="contains")

    class Meta:
        model = Metric
        fields = {
            "name": ["exact", "icontains"],
            "display_name": ["exact", "icontains"],
        }
