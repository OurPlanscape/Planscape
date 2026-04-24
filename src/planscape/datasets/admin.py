import json
from typing import Any, Dict

from django.conf import settings
from django.contrib import admin
from django.core.exceptions import PermissionDenied
from django.http import Http404, JsonResponse
from django.urls import path
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


class CatalogOnlyAdminMixin:
    """Restricts all write operations (add/change/delete) to the catalog environment.

    Apply to any ModelAdmin whose models are managed exclusively through the
    catalog deployment. Read access is still allowed in other environments.
    """

    def has_add_permission(self, request):
        return settings.ENV == "catalog" and super().has_add_permission(request)

    def has_change_permission(self, request, obj=None):
        return settings.ENV == "catalog" and super().has_change_permission(request, obj)

    def has_delete_permission(self, request, obj=None):
        return settings.ENV == "catalog" and super().has_delete_permission(request, obj)


class CategoryAdmin(CatalogOnlyAdminMixin, TreeAdmin):
    form = CategoryAdminForm
    search_fields = ["name"]
    list_display = ("id", "name", "order", "dataset")

    def get_changeform_initial_data(self, request) -> Dict[str, Any]:
        return {"created_by": request.user}


class DatasetAdmin(CatalogOnlyAdminMixin, admin.ModelAdmin):
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


class DataLayerHasStyleAdmin(CatalogOnlyAdminMixin, admin.TabularInline):
    model = DataLayerHasStyle
    form = DataLayerHasStyleAdminForm
    raw_id_fields = ["style"]


class DataLayerAdmin(CatalogOnlyAdminMixin, admin.ModelAdmin):
    geometry_preview_fields = {"geometry", "outline"}

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

    def get_queryset(self, request):
        return super().get_queryset(request).defer("geometry", "outline")

    def get_urls(self):
        return [
            path(
                "<path:object_id>/geometry-preview/<str:field_name>/",
                self.admin_site.admin_view(self.geometry_preview_view),
                name="datasets_datalayer_geometry_preview",
            ),
            *super().get_urls(),
        ]

    def geometry_preview_view(self, request, object_id, field_name):
        if field_name not in self.geometry_preview_fields:
            raise Http404

        obj = DataLayer.objects.only(field_name).filter(pk=object_id).first()
        if obj is None:
            raise Http404
        if not self.has_view_or_change_permission(request, obj):
            raise PermissionDenied

        geometry = getattr(obj, field_name)
        if geometry and geometry.srid != 4326:
            geometry = geometry.transform(4326, clone=True)

        return JsonResponse(
            {"geometry": json.loads(geometry.geojson) if geometry else None}
        )

    def _enable_module(self, request, queryset, module: str) -> None:
        for datalayer in queryset:
            enable_datalayer_module(datalayer, module)
        self.message_user(
            request,
            f"Enabled {module} module for {queryset.count()} datalayers.",
        )

    @admin.action(
        description="Calculate outline for selected datalayers",
        permissions=["change"],
    )
    def calculate_outline(self, request, queryset):
        ids = list(queryset.values_list("id", flat=True))
        for datalayer_id in ids:
            calculate_datalayer_outline.delay(datalayer_id)
        self.message_user(
            request, f"Queued outline calculation for {len(ids)} datalayers."
        )

    @admin.action(description="enable forsys", permissions=["change"])
    def enable_forsys(self, request, queryset):
        self._enable_module(request, queryset, "forsys")

    @admin.action(description="enable impacts", permissions=["change"])
    def enable_impacts(self, request, queryset):
        self._enable_module(request, queryset, "impacts")

    @admin.action(description="enable map", permissions=["change"])
    def enable_map(self, request, queryset):
        self._enable_module(request, queryset, "map")

    @admin.action(description="enable climate_foresight", permissions=["change"])
    def enable_climate_foresight(self, request, queryset):
        self._enable_module(request, queryset, "climate_foresight")


class AssociateStyleWithDataLayer(CatalogOnlyAdminMixin, admin.TabularInline):
    model = DataLayerHasStyle
    form = DataLayerHasStyleAdminForm
    raw_id_fields = ["datalayer"]
    min_num = 1
    max_num = 1


class StyleAdmin(CatalogOnlyAdminMixin, admin.ModelAdmin):
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
