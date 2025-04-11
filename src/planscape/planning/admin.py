from typing import Dict, Any

from django.contrib import admin

from planning.models import TreatmentGoal, TreatmentGoalUsesDataLayer
from planning.forms import TreatmentGoalAdminForm, TreatmentGoalUsesDataLayerAdminForm


class TreatmentGoalUsesDataLayerInline(admin.TabularInline):
    model = TreatmentGoalUsesDataLayer

    form = TreatmentGoalUsesDataLayerAdminForm
    raw_id_fields = ["datalayer"]


class TreatmentGoalAdmin(admin.ModelAdmin):
    """
    Admin interface for TreatmentGoal model.
    """

    list_display = ("id", "name", "category", "active")
    list_display_links = ("id", "name")
    form = TreatmentGoalAdminForm
    search_fields = ["name"]
    list_filter = ["active", "category"]
    ordering = ["name"]
    raw_id_fields = ["created_by"]
    inlines = [
        TreatmentGoalUsesDataLayerInline,
    ]

    def get_changeform_initial_data(self, request) -> Dict[str, Any]:
        return {"created_by": request.user}


class TreatmentGoalUsesDataLayerAdmin(admin.ModelAdmin):
    """
    Admin interface for TreatmentGoalUsesDataLayer model.
    """

    list_display = ("id", "usage_type", "treatment_goal", "datalayer", "threshold")
    list_display_links = ("id", "usage_type")
    form = TreatmentGoalUsesDataLayerAdminForm
    search_fields = ["usage_type", "treatment_goal__name", "datalayer__name"]
    list_filter = ["usage_type", "treatment_goal__name", "datalayer__name"]
    ordering = ["usage_type", "treatment_goal__name", "datalayer__name"]
    raw_id_fields = ["treatment_goal", "datalayer"]


admin.site.register(TreatmentGoal, TreatmentGoalAdmin)
admin.site.register(
    TreatmentGoalUsesDataLayer,
    TreatmentGoalUsesDataLayerAdmin,
)
