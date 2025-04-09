from django import forms
from django_json_widget.widgets import JSONEditorWidget
from martor.widgets import AdminMartorWidget

from planning.models import TreatmentGoal, TreatmentGoalUsesDataLayer


class TreatmentGoalAdminForm(forms.ModelForm):
    """
    Admin form for TreatmentGoal model.
    """

    class Meta:
        model = TreatmentGoal
        widgets = {
            "description": AdminMartorWidget,
            "priorities": JSONEditorWidget,
            "stand_thresholds": JSONEditorWidget,
        }
        fields = (
            "name",
            "category",
            "description",
            "priorities",
            "stand_thresholds",
            "active",
            "created_by",
        )


class TreatmentGoalUsesDataLayerAdminForm(forms.ModelForm):
    """
    Admin form for TreatmentGoalUsesDataLayer model.
    """

    class Meta:
        model = TreatmentGoalUsesDataLayer
        widgets = {
            "thresholds": JSONEditorWidget,
            "constraints": JSONEditorWidget,
        }
        fields = (
            "usage_type",
            "treatment_goal",
            "datalayer",
            "thresholds",
            "constraints",
        )
