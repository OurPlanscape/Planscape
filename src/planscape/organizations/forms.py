from django import forms

from organizations.models import Organization


class OrganizationAdminForm(forms.ModelForm):
    description = forms.CharField(widget=forms.Textarea, required=False)
    version = forms.CharField(required=False)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["created_by"].disabled = True

    class Meta:
        model = Organization
        fields = (
            "created_by",
            "name",
            "type",
            "type_other",
            "website",
        )
