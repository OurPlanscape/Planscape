from typing import Any, Dict

from django.contrib import admin

from planning.forms import TreatmentGoalAdminForm, TreatmentGoalUsesDataLayerAdminForm
from planning.models import TreatmentGoal, TreatmentGoalUsesDataLayer


class TreatmentGoalUsesDataLayerInline(admin.TabularInline):
    model = TreatmentGoalUsesDataLayer
    form = TreatmentGoalUsesDataLayerAdminForm
    raw_id_fields = ["datalayer"]
    fields = ("usage_type", "datalayer", "threshold", "weight")


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

    def save_form(self, request, form, change):
        instance = form.instance
        try:
            db_instance = TreatmentGoal.objects.get(pk=instance.pk)
            instance.geometry = db_instance.geometry
            form.instance = instance
        except TreatmentGoal.DoesNotExist:
            pass
        return super().save_form(request, form, change)


class TreatmentGoalUsesDataLayerAdmin(admin.ModelAdmin):
    """
    Admin interface for TreatmentGoalUsesDataLayer model.
    """

    list_display = (
        "id",
        "usage_type",
        "treatment_goal",
        "datalayer",
        "threshold",
        "weight",
    )
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
