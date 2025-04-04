from typing import Optional

from django.db.models import QuerySet
from django_filters import rest_framework as filters
from rest_framework.request import Request

from datasets.models import DataLayer, Dataset, Style


def get_datasets_for_filter(request: Optional[Request]) -> "QuerySet[Dataset]":
    if request is None:
        return Dataset.objects.none()

    # TODO: this needs to be tweaked when we create the controls to associate users and
    # organizations. we should retrieve the organization(s) based on the request.user
    # and return all the organizations, so we can filter the datasets here.
    return Dataset.objects.all()


def get_styles_for_filter(request: Optional[Request]) -> "QuerySet[Style]":
    if request is None:
        return Style.objects.none()

    # TODO: this needs to be tweaked when we create the controls to associate users and
    # organizations. we should retrieve the organization(s) based on the request.user
    # and return all the organizations, so we can filter the datasets here.
    return Style.objects.all()


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
            "original_name": ["exact", "icontains"],
        }


class StyleFilterSet(filters.FilterSet):
    class Meta:
        model = Style
        fields = {
            "organization": ["exact"],
            "name": ["exact", "icontains"],
            "type": ["exact"],
        }


class BrowseDataLayerFilterSet(filters.FilterSet):
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
        }
