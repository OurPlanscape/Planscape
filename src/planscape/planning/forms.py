from django import forms
from martor.widgets import AdminMartorWidget

from planning.models import TreatmentGoal, TreatmentGoalUsesDataLayer


class TreatmentGoalAdminForm(forms.ModelForm):
    """
    Admin form for TreatmentGoal model.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["description"].required = False
        self.fields["created_by"].required = False

    class Meta:
        model = TreatmentGoal
        widgets = {
            "description": AdminMartorWidget,
        }
        fields = (
            "name",
            "category",
            "description",
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

    class Meta:
        model = TreatmentGoalUsesDataLayer
        fields = (
            "usage_type",
            "treatment_goal",
            "datalayer",
            "threshold",
        )
