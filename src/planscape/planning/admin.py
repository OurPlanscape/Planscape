from typing import Any, Dict

from django.contrib import admin

from planning.forms import TreatmentGoalAdminForm, TreatmentGoalUsesDataLayerAdminForm
from planning.models import TreatmentGoal, TreatmentGoalUsesDataLayer


class TreatmentGoalUsesDataLayerInline(admin.TabularInline):
    model = TreatmentGoalUsesDataLayer

    form = TreatmentGoalUsesDataLayerAdminForm
    raw_id_fields = ["datalayer"]


class TreatmentGoalAdmin(admin.ModelAdmin):
    """
    Admin interface for TreatmentGoal model.
    """

    list_display = ("id", "name", "category", "group", "active")
    list_display_links = ("id", "name")
    form = TreatmentGoalAdminForm
    search_fields = ["name"]
    list_filter = ["active", "category", "group"]
    ordering = ["name"]
    raw_id_fields = ["created_by"]
    inlines = [
        TreatmentGoalUsesDataLayerInline,
    ]

    def get_changeform_initial_data(self, request) -> Dict[str, Any]:
        return {"created_by": request.user}

    def save_related(self, request, form, formsets, change):
        super().save_related(request, form, formsets, change)
        treatment_goal = form.instance
        geometry = treatment_goal.datalayers.all().geometric_intersection()  # type: ignore
        treatment_goal.geometry = geometry
        treatment_goal.save()


class TreatmentGoalUsesDataLayerAdmin(admin.ModelAdmin):
    """
    Admin interface for TreatmentGoalUsesDataLayer model.
    """

    list_display = ("id", "usage_type", "treatment_goal", "datalayer", "threshold")
    list_display_links = ("id", "usage_type")
    search_fields = ["usage_type", "treatment_goal__name", "datalayer__name"]
    list_filter = ["usage_type", "treatment_goal__name", "datalayer__name"]
    ordering = ["usage_type", "treatment_goal__name", "datalayer__name"]
    raw_id_fields = ["treatment_goal", "datalayer"]

    def has_add_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=...):
        return False


admin.site.register(TreatmentGoal, TreatmentGoalAdmin)
admin.site.register(
    TreatmentGoalUsesDataLayer,
    TreatmentGoalUsesDataLayerAdmin,
)
