from django.contrib import admin
from datasets.forms import DatasetAdminForm, CategoryAdminForm
from datasets.models import Category, DataLayer, Dataset
from treebeard.admin import TreeAdmin
from treebeard.forms import movenodeform_factory


class CategoryAdmin(TreeAdmin):
    form = CategoryAdminForm
    search_fields = ["name"]


class DatasetAdmin(admin.ModelAdmin):
    list_filter = ["visibility"]
    search_fields = ["organization__name__icontains", "name"]
    autocomplete_fields = ["organization"]
    form = DatasetAdminForm


class DataLayerAdmin(admin.ModelAdmin):
    search_fields = [
        "organization__name__icontains",
        "dataset__name__icontains",
        "created_by__username__icontains",
        "name",
    ]
    autocomplete_fields = ["organization", "created_by", "dataset", "category"]


admin.site.register(Dataset, DatasetAdmin)
admin.site.register(DataLayer, DataLayerAdmin)
admin.site.register(Category, CategoryAdmin)
