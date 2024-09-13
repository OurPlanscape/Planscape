from django_filters import rest_framework as filters
from metrics.models import Category, Metric
from organizations.models import Organization
from planscape.filters import CharArrayFilter
from projects.models import Project


class MetricFilterSet(filters.FilterSet):
    organization = filters.ModelChoiceFilter(
        queryset=Organization.objects.all(),
        field_name="project__organization",
        help_text="Organization ID.",
    )

    project = filters.ModelChoiceFilter(
        queryset=Project.objects.all(),
        help_text="Project ID.",
    )

    category = filters.ModelChoiceFilter(
        queryset=Category.objects.all(),
        help_text="Category ID.",
    )

    capabilities = CharArrayFilter(
        lookup_expr="contains",
        help_text="Capabilities. Multiple values may be separated by commas.",
    )

    name = filters.CharFilter(help_text="Metric name.")

    display_name = filters.CharFilter(help_text="Metric display name.")

    class Meta:
        model = Metric
        fields = {
            "name": ["exact", "icontains"],
            "display_name": ["exact", "icontains"],
        }
