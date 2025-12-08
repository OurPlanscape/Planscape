import json

import mmh3
from cacheops import invalidate_model
from django import forms
from django_json_widget.widgets import JSONEditorWidget
from treebeard.forms import movenodeform_factory

from datasets.models import (
    Category,
    DataLayer,
    DataLayerHasStyle,
    Dataset,
    PreferredDisplayType,
    SelectionTypeOptions,
    Style,
)


class DatasetAdminForm(forms.ModelForm):
    description = forms.CharField(widget=forms.Textarea, required=False)
    version = forms.CharField(required=False)
    selection_type = forms.TypedChoiceField(
        choices=SelectionTypeOptions.choices,
        required=False,
        empty_value=None,
    )
    preferred_display_type = forms.TypedChoiceField(
        choices=PreferredDisplayType.choices,
        required=False,
        empty_value=None,
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["created_by"].disabled = False

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
            "table",
            "info",
            "metadata",
            "geometry",
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
