from django_filters import rest_framework as filters
from goals.models import TreatmentGoal
from organizations.models import Organization
from planscape.filters import CharArrayFilter
from projects.models import Project


class TreatmentGoalFilterSet(filters.FilterSet):
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

    class Meta:
        model = TreatmentGoal
        fields = {
            "name": ["exact", "icontains"],
        }
