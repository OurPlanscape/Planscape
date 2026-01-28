from django import forms
from martor.widgets import AdminMartorWidget

from planning.models import (
    TreatmentGoal,
    TreatmentGoalUsesDataLayer,
    TreatmentGoalUsageType,
)


class TreatmentGoalAdminForm(forms.ModelForm):
    """
    Admin form for TreatmentGoal model.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["description"].required = False
        self.fields["created_by"].required = False
        self.fields["geometry"].required = False

    class Meta:
        model = TreatmentGoal
        widgets = {"description": AdminMartorWidget}
        fields = (
            "name",
            "category",
            "group",
            "description",
            "geometry",
            "active",
            "created_by",
        )


class TreatmentGoalUsesDataLayerAdminForm(forms.ModelForm):
    """
    Admin form for TreatmentGoalUsesDataLayer model.
    Weight is always editable, but enforced on save.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        self.fields["threshold"].required = False

        if "weight" in self.fields:
            self.fields["weight"].required = False
            self.fields["weight"].help_text = (
                "Only applies when Usage Type = PRIORITY. "
                "Non-PRIORITY will be saved as 1.0."
            )

    def clean(self):
        cleaned = super().clean()
        usage_type = cleaned.get("usage_type")

        if usage_type != TreatmentGoalUsageType.PRIORITY:
            cleaned["weight"] = 1.0
            return cleaned

        weight = cleaned.get("weight")
        if weight in (None, ""):
            cleaned["weight"] = 1.0
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
