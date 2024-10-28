from django import forms

from datasets.models import Category, DataLayer, Dataset
from treebeard.forms import movenodeform_factory
from django_json_widget.widgets import JSONEditorWidget


class DatasetAdminForm(forms.ModelForm):
    description = forms.CharField(widget=forms.Textarea, required=False)
    version = forms.CharField(required=False)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["created_by"].disabled = True

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
        self.fields["created_by"].disabled = True

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

    def get_initial_for_field(self, field, field_name):
        match field_name:
            case "public_url":
                if self.instance:
                    return self.instance.get_public_url()
                return None
            case _:
                return super().get_initial_for_field(field, field_name)

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
            "info",
            "metadata",
        )
