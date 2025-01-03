from django import forms

from datasets.models import Category, DataLayer, Dataset
from treebeard.forms import movenodeform_factory
from django_json_widget.widgets import JSONEditorWidget


class DatasetAdminForm(forms.ModelForm):
    description = forms.CharField(widget=forms.Textarea, required=False)
    version = forms.CharField(required=False)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["created_by"].disabled = False

    class Meta:
        model = Dataset
        fields = (
            "organization",
            "created_by",
            "name",
            "visibility",
            "description",
            "version",
        )


class CategoryAdminForm(movenodeform_factory(Category)):
    order = forms.IntegerField(required=False)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["created_by"].disabled = False

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
        self.fields["original_name"].disabled = True
        self.fields["url"].disabled = True
        self.fields["mimetype"].disabled = True
        self.fields["geometry"].disabled = True

    class Meta:
        model = DataLayer
        widgets = {
            "info": JSONEditorWidget,
            "metadata": JSONEditorWidget,
        }
        fields = (
            "organization",
            "created_by",
            "dataset",
            "category",
            "name",
            "original_name",
            "url",
            "info",
            "metadata",
            "mimetype",
            "geometry",
        )
