import json

import mmh3
from cacheops import invalidate_model
from django import forms
from django.contrib import admin
from django.contrib.admin.widgets import AutocompleteSelectMultiple
from django.urls import reverse
from django_json_widget.widgets import JSONEditorWidget
from treebeard.forms import movenodeform_factory

from datasets.models import (
    Category,
    DataLayer,
    DataLayerHasStyle,
    Dataset,
    SimpleCategory,
    Style,
)
from datasets.shapefile_geometry import (
    ShapefileGeometryError,
    geometry_from_uploaded_shapefile_zip,
)
from datasets.widgets import ReadOnlyOSMGeometryWidget


class DatasetAdminForm(forms.ModelForm):
    modules = forms.MultipleChoiceField(
        choices=(),
        required=False,
        widget=forms.SelectMultiple,
    )
    description = forms.CharField(widget=forms.Textarea, required=False)
    version = forms.CharField(required=False)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from modules.base import MODULE_HANDLERS

        self.fields["created_by"].disabled = False
        self.fields["modules"].choices = [
            (module, module) for module in MODULE_HANDLERS.keys()
        ]
        if self.instance and self.instance.modules is None:
            self.initial.setdefault("modules", [])

    def clean_modules(self):
        modules = self.cleaned_data.get("modules")
        if not modules:
            return None
        return modules

    def save(self, commit=True):
        invalidate_model(Dataset)
        return super().save(commit)

    class Meta:
        model = Dataset
        fields = (
            "organization",
            "created_by",
            "name",
            "visibility",
            "description",
            "version",
            "selection_type",
            "preferred_display_type",
            "modules",
        )


class CategoryAdminForm(movenodeform_factory(Category)):
    order = forms.IntegerField(required=False)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["created_by"].disabled = False

    def save(self, commit=True):
        invalidate_model(Category)
        return super().save(commit)

    class Meta:
        model = Category
        fields = (
            "organization",
            "dataset",
            "created_by",
            "name",
            "order",
        )


class SimpleCategoryAdminForm(forms.ModelForm):
    datalayers = forms.ModelMultipleChoiceField(
        queryset=DataLayer.objects.defer("geometry", "outline"),
        required=False,
        # the autocomplete view needs a forward relation pointing at DataLayer,
        # so we use the datalayer FK of the M2M through table.
        widget=AutocompleteSelectMultiple(
            DataLayer.simple_categories.through._meta.get_field("datalayer"),
            admin.site,
        ),
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.pk:
            self.fields["datalayers"].initial = self.instance.datalayers.all()

    def _save_m2m(self):
        super()._save_m2m()
        self.instance.datalayers.set(self.cleaned_data["datalayers"])

    class Meta:
        model = SimpleCategory
        fields = (
            "name",
            "icon",
            "datalayers",
        )


class DataLayerAdminForm(forms.ModelForm):
    geometry_shapefile_zip = forms.FileField(
        required=False,
        label="Geometry shapefile zip",
        help_text="Upload a zipped polygon shapefile to update geometry and outline only.",
    )
    geometry = forms.CharField(
        required=False,
        disabled=True,
        widget=ReadOnlyOSMGeometryWidget(),
    )
    outline = forms.CharField(
        required=False,
        disabled=True,
        widget=ReadOnlyOSMGeometryWidget(),
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["info"].required = False
        self.fields["info"].disabled = True
        self.fields["category"].required = False
        self.fields["metadata"].required = False
        if self.instance and self.instance.pk:
            self.fields["geometry"].widget.geometry_url = reverse(
                "admin:datasets_datalayer_geometry_preview",
                args=[self.instance.pk, "geometry"],
            )
            self.fields["outline"].widget.geometry_url = reverse(
                "admin:datasets_datalayer_geometry_preview",
                args=[self.instance.pk, "outline"],
            )

        self.order_fields(
            [
                "organization",
                "dataset",
                "category",
                "name",
                "info",
                "metadata",
                "geometry_shapefile_zip",
                "geometry",
                "outline",
            ]
        )

    def clean_geometry_shapefile_zip(self):
        uploaded_file = self.cleaned_data.get("geometry_shapefile_zip")
        self.uploaded_shapefile_geometry = None
        if not uploaded_file:
            return uploaded_file

        try:
            self.uploaded_shapefile_geometry = geometry_from_uploaded_shapefile_zip(
                uploaded_file
            )
        except ShapefileGeometryError as exc:
            raise forms.ValidationError(str(exc)) from exc
        return uploaded_file

    def save(self, commit=True):
        invalidate_model(DataLayer)
        return super().save(commit)

    class Meta:
        model = DataLayer
        widgets = {
            "info": JSONEditorWidget,
            "metadata": JSONEditorWidget,
        }
        fields = (
            "organization",
            "dataset",
            "category",
            "name",
            "info",
            "metadata",
        )


class StyleAdminForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def save(self, commit=True):
        form_data = self.cleaned_data
        self.instance.data_hash = mmh3.hash_bytes(json.dumps(form_data["data"])).hex()
        invalidate_model(Style)
        invalidate_model(DataLayerHasStyle)
        return super().save(commit)

    class Meta:
        model = Style
        widgets = {
            "data": JSONEditorWidget,
        }
        fields = (
            "organization",
            "name",
            "type",
            "data",
        )


class DataLayerHasStyleAdminForm(forms.ModelForm):
    """
    Admin form for TreatmentGoalUsesDataLayer model.
    """

    class Meta:
        model = DataLayerHasStyle
        fields = (
            "style",
            "datalayer",
        )
