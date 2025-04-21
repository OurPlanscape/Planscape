from typing import Any, Dict

from django.contrib import admin
from treebeard.admin import TreeAdmin

from datasets.forms import (
    CategoryAdminForm,
    DataLayerAdminForm,
    DataLayerHasStyleAdminForm,
    DatasetAdminForm,
    StyleAdminForm,
)
from datasets.models import Category, DataLayer, DataLayerHasStyle, Dataset, Style


class CategoryAdmin(TreeAdmin):
    form = CategoryAdminForm
    search_fields = ["name"]
    list_display = ("id", "name", "order", "dataset")

    def get_changeform_initial_data(self, request) -> Dict[str, Any]:
        return {"created_by": request.user}


class DatasetAdmin(admin.ModelAdmin):
    list_filter = ["visibility"]
    search_fields = ["organization__name__icontains", "name"]
    autocomplete_fields = ["organization"]
    form = DatasetAdminForm
    list_display = ("id", "name", "visibility", "organization")
    list_display_links = (
        "id",
        "name",
    )

    def get_changeform_initial_data(self, request) -> Dict[str, Any]:
        return {"created_by": request.user}


class DataLayerHasStyleAdmin(admin.TabularInline):
    model = DataLayerHasStyle
    form = DataLayerHasStyleAdminForm
    raw_id_fields = ["style"]


class DataLayerAdmin(admin.ModelAdmin):
    @admin.display(description="Public URL")
    def public_url(self, instance):
        return instance.get_public_url()

    form = DataLayerAdminForm

    search_fields = [
        "organization__name__icontains",
        "dataset__name__icontains",
        "created_by__username__icontains",
        "name",
        "table",
    ]
    autocomplete_fields = ["organization", "created_by", "dataset", "category"]
    list_display = (
        "id",
        "name",
        "status",
        "type",
        "geometry_type",
        "dataset",
        "category",
        "organization",
    )
    list_display_links = (
        "id",
        "name",
        "status",
        "type",
        "geometry_type",
    )
    readonly_fields = [
        "created_by",
        "status",
        "geometry_type",
        "type",
        "storage_type",
        "original_name",
        "mimetype",
        "table",
        "public_url",
    ]
    inlines = [DataLayerHasStyleAdmin]


class AssociateStyleWithDataLayer(admin.TabularInline):
    model = DataLayerHasStyle
    form = DataLayerHasStyleAdminForm
    raw_id_fields = ["datalayer"]
    min_num = 1
    max_num = 1


class StyleAdmin(admin.ModelAdmin):
    form = StyleAdminForm
    search_fields = [
        "organization__name__icontains",
        "created_by__username__icontains",
        "name",
    ]
    autocomplete_fields = [
        "organization",
        "created_by",
    ]
    list_display = (
        "id",
        "name",
        "type",
        "data_hash",
    )
    list_display_links = (
        "id",
        "name",
        "type",
        "data_hash",
    )
    readonly_fields = ["data_hash"]
    inlines = [AssociateStyleWithDataLayer]

    def save_model(self, request, obj, form, change):
        obj.created_by = request.user
        return super().save_model(request, obj, form, change)


admin.site.register(Dataset, DatasetAdmin)
admin.site.register(DataLayer, DataLayerAdmin)
admin.site.register(Category, CategoryAdmin)
admin.site.register(Style, StyleAdmin)
