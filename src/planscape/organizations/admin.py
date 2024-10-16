from django.contrib import admin
from organizations.models import Organization


class OrganizationAdmin(admin.ModelAdmin):
    search_fields = ["name"]


admin.site.register(Organization, OrganizationAdmin)
