
from django import forms
from django_json_widget.widgets import JSONEditorWidget

from planning.models import TreatmentGoal

class TreatmentGoalAdminForm(forms.ModelForm):
    """
    Admin form for TreatmentGoal model.
    """

    class Meta:
        model = TreatmentGoal
        widgets = {
            "priorities": JSONEditorWidget,
            "stand_thresholds": JSONEditorWidget,
        }
        fields = (
            "name",
            "description",
            "priorities",
            "stand_thresholds",
            "active",
        )