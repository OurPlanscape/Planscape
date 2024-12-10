from typing import Optional
from django_filters import rest_framework as filters
from django.db.models import QuerySet
from rest_framework.request import Request
from impacts.models import TreatmentPlan, TreatmentPlanStatus
from datasets.models import DataLayer, Dataset


def get_datasets_for_filter(request: Optional[Request]) -> "QuerySet[Dataset]":
    if request is None:
        return Dataset.objects.none()

    # TODO: this needs to be tweaked when we create the controls to associate users and
    # organizations. we should retrieve the organization(s) based on the request.user
    # and return all the organizations, so we can filter the datasets here.
    return Dataset.objects.all()


class DataLayerFilterSet(filters.FilterSet):
    dataset = filters.ModelChoiceFilter(
        queryset=get_datasets_for_filter,
        field_name="dataset",
        help_text="dataset id",
    )

    class Meta:
        model = DataLayer
        fields = {
            "name": ["exact", "icontains"],
            "category": ["exact"],
            "type": ["exact"],
            "status": ["exact"],
        }
