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
from datasets.services import enable_datalayer_module
from datasets.tasks import calculate_datalayer_outline


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
    list_display = (
        "id",
        "name",
        "visibility",
        "organization",
        "selection_type",
    )
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
        "map_service_type",
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
        "map_service_type",
        "url",
        "original_name",
        "mimetype",
        "table",
        "public_url",
        "deleted_at",
    ]
    inlines = [DataLayerHasStyleAdmin]
    actions = [
        "calculate_outline",
        "enable_forsys",
        "enable_impacts",
        "enable_map",
        "enable_climate_foresight",
    ]

    def _enable_module(self, request, queryset, module: str) -> None:
        for datalayer in queryset:
            enable_datalayer_module(datalayer, module)
        self.message_user(
            request,
            f"Enabled {module} module for {queryset.count()} datalayers.",
        )

    @admin.action(description="Calculate outline for selected datalayers")
    def calculate_outline(self, request, queryset):
        ids = list(queryset.values_list("id", flat=True))
        for datalayer_id in ids:
            calculate_datalayer_outline.delay(datalayer_id)
        self.message_user(request, f"Queued outline calculation for {len(ids)} datalayers.")

    @admin.action(description="enable forsys")
    def enable_forsys(self, request, queryset):
        self._enable_module(request, queryset, "forsys")

    @admin.action(description="enable impacts")
    def enable_impacts(self, request, queryset):
        self._enable_module(request, queryset, "impacts")

    @admin.action(description="enable map")
    def enable_map(self, request, queryset):
        self._enable_module(request, queryset, "map")

    @admin.action(description="enable climate_foresight")
    def enable_climate_foresight(self, request, queryset):
        self._enable_module(request, queryset, "climate_foresight")


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
