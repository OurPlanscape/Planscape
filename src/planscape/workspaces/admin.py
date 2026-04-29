from django.contrib import admin

from workspaces.models import UserAccessWorkspace, Workspace


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "visibility", "created_at", "updated_at", "deleted_at")
    list_filter = ("visibility",)
    search_fields = ("name",)
    readonly_fields = ("created_at", "updated_at", "deleted_at")


@admin.register(UserAccessWorkspace)
class UserAccessWorkspaceAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "workspace", "role", "created_at", "updated_at")
    list_filter = ("role",)
    search_fields = ("user__email", "workspace__name")
    readonly_fields = ("created_at", "updated_at")
