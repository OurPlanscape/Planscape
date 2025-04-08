from django.contrib import admin

from planning.models import TreatmentGoal
from planning.forms import TreatmentGoalAdminForm


class TreatmentGoalAdmin(admin.ModelAdmin):
    """
    Admin interface for TreatmentGoal model.
    """

    list_display = ("id", "name", "description", "priorities", "active")
    list_display_links = ("id", "name")
    form = TreatmentGoalAdminForm
    search_fields = ["name"]
    list_filter = ["priorities"]
    ordering = ["name"]


admin.site.register(TreatmentGoal, TreatmentGoalAdmin)
