from typing import Any, Dict

from django.contrib import admin
from organizations.forms import OrganizationAdminForm
from organizations.models import Organization


class OrganizationAdmin(admin.ModelAdmin):
    search_fields = ["name"]
    list_display = ("id", "name", "type")
    list_display_links = ("id", "name")
    list_filter = ("type",)
    form = OrganizationAdminForm

    def get_changeform_initial_data(self, request) -> Dict[str, Any]:
        return {"created_by": request.user}

    def save_model(self, request, obj, form, change):
        obj.created_by = request.user
        return super().save_model(request, obj, form, change)


admin.site.register(Organization, OrganizationAdmin)

admin.site.register(Organization, OrganizationAdmin)
