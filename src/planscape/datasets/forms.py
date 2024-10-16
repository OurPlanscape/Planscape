from django import forms

from datasets.models import Category, Dataset
from treebeard.forms import movenodeform_factory


class DatasetAdminForm(forms.ModelForm):
    description = forms.CharField(widget=forms.Textarea, required=False)
    version = forms.CharField(required=False)

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

    class Meta:
        model = Category
        fields = (
            "organization",
            "created_by",
            "dataset",
            "name",
            "order",
        )
