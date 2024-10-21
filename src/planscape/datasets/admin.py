from typing import Any, Dict
from django.contrib import admin
from datasets.forms import DatasetAdminForm, CategoryAdminForm
from datasets.models import Category, DataLayer, Dataset
from treebeard.admin import TreeAdmin
from treebeard.forms import movenodeform_factory


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


class DataLayerAdmin(admin.ModelAdmin):
    search_fields = [
        "organization__name__icontains",
        "dataset__name__icontains",
        "created_by__username__icontains",
        "name",
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


admin.site.register(Dataset, DatasetAdmin)
admin.site.register(DataLayer, DataLayerAdmin)
admin.site.register(Category, CategoryAdmin)
