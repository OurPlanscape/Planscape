from typing import Any, Dict
from django.contrib import admin
from datasets.forms import DataLayerAdminForm, DatasetAdminForm, CategoryAdminForm
from datasets.models import Category, DataLayer, Dataset
from treebeard.admin import TreeAdmin


class CategoryAdmin(TreeAdmin):
    form = CategoryAdminForm
    search_fields = ["name"]
    list_display = ("id", "name", "order", "dataset")

    # Attach the current user to the form
    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        # Attach the current user so the form can access it if needed
        form.current_user = request.user
        return form

    # On save, explicitly set created_by if it's not already set
    def save_model(self, request, obj, form, change):
        if not obj.created_by_id:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


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

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        form.current_user = request.user
        return form

    def save_model(self, request, obj, form, change):
        if not obj.created_by_id:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


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
        "public_url",
    ]

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        form.current_user = request.user
        return form

    def save_model(self, request, obj, form, change):
        if not obj.created_by_id:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

admin.site.register(Dataset, DatasetAdmin)
admin.site.register(DataLayer, DataLayerAdmin)
admin.site.register(Category, CategoryAdmin)
