from django.contrib import admin
from organizations.models import Organization


class OrganizationAdmin(admin.ModelAdmin):
    search_fields = ["name"]
    list_display = ("id", "name", "type")
    list_display_links = ("id", "name")
    list_filter = ("type",)


admin.site.register(Organization, OrganizationAdmin)
