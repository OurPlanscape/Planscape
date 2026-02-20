import json

import mmh3
from cacheops import invalidate_model
from django import forms
from django_json_widget.widgets import JSONEditorWidget
from treebeard.forms import movenodeform_factory

from datasets.models import Category, DataLayer, DataLayerHasStyle, Dataset, Style
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


class DataLayerAdminForm(forms.ModelForm):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["info"].required = False
        self.fields["info"].disabled = True
        self.fields["category"].required = False
        self.fields["metadata"].required = False
        self.fields["geometry"].required = False
        self.fields["geometry"].disabled = True
        self.fields["outline"].required = False
        self.fields["outline"].disabled = True

    def save(self, commit=True):
        invalidate_model(DataLayer)
        return super().save(commit)

    class Meta:
        model = DataLayer
        widgets = {
            "info": JSONEditorWidget,
            "metadata": JSONEditorWidget,
            "geometry": ReadOnlyOSMGeometryWidget(),
            "outline": ReadOnlyOSMGeometryWidget(),
        }
        fields = (
            "organization",
            "dataset",
            "category",
            "name",
            "table",
            "info",
            "metadata",
            "geometry",
            "outline",
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
