from django import forms
from datasets.shapefile_geometry import (
    ShapefileGeometryError,
    geometry_from_uploaded_shapefile_zip,
)
from martor.widgets import AdminMartorWidget

from planning.models import (
    TreatmentGoal,
    TreatmentGoalUsageType,
    TreatmentGoalUsesDataLayer,
)


class TreatmentGoalAdminForm(forms.ModelForm):
    """
    Admin form for TreatmentGoal model.
    """

    geometry_shapefile_zip = forms.FileField(
        required=False,
        label="Geometry shapefile zip",
        help_text="Upload a zipped polygon shapefile to update geometry only.",
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["description"].required = False
        self.fields["created_by"].required = False
        self.fields["geometry"].required = False

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

    class Meta:
        model = TreatmentGoal
        widgets = {"description": AdminMartorWidget}
        fields = (
            "name",
            "category",
            "group",
            "description",
            "geometry_shapefile_zip",
            "geometry",
            "active",
            "created_by",
        )


class TreatmentGoalUsesDataLayerAdminForm(forms.ModelForm):
    """
    Admin form for TreatmentGoalUsesDataLayer model.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fields["threshold"].required = False

        if "weight" in self.fields:
            self.fields["weight"].required = False
            self.fields[
                "weight"
            ].help_text = "Only applies when Usage Type = PRIORITY. "

    def clean(self):
        cleaned = super().clean()
        usage_type = cleaned.get("usage_type")
        weight = cleaned.get("weight")

        if usage_type != TreatmentGoalUsageType.PRIORITY:
            cleaned["weight"] = None
            return cleaned

        if weight in (None, ""):
            raise forms.ValidationError(
                {"weight": "Required for PRIORITY. Must be a positive integer (>= 1)."}
            )
        return cleaned

    class Meta:
        model = TreatmentGoalUsesDataLayer
        fields = (
            "usage_type",
            "treatment_goal",
            "datalayer",
            "threshold",
            "weight",
        )
