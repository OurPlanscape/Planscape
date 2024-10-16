from django.contrib import admin
from datasets.models import Category, DataLayer, Dataset
from treebeard.admin import TreeAdmin
from treebeard.forms import movenodeform_factory


class CategoryAdmin(TreeAdmin):
    form = movenodeform_factory(Category)


admin.site.register(Dataset)
admin.site.register(DataLayer)
admin.site.register(Category, CategoryAdmin)
