from django_filters import rest_framework as filters
from goals.models import TreatmentGoal
from organizations.models import Organization
from planscape.filters import CharArrayFilter
from projects.models import Project


class TreatmentGoalFilterSet(filters.FilterSet):
    organization = filters.ModelChoiceFilter(
        queryset=Organization.objects.all(),
        field_name="project__organization",
        help_text="Organization ID.",
    )

    project = filters.ModelChoiceFilter(
        queryset=Project.objects.all(),
        field_name="project",
        help_text="Project ID.",
    )

    name = filters.CharFilter(
        help_text="Name of the treatment goal. Equivalent to short_question_text."
    )

    class Meta:
        model = TreatmentGoal
        fields = {
            "name": ["exact", "icontains"],
        }
