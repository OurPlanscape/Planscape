from django.contrib import admin

from workspaces.models import UserAccessWorkspace, Workspace


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "kind",
        "visibility",
        "creator_name",
        "created_at",
        "updated_at",
        "deleted_at",
    )
    list_filter = ("kind", "visibility")
    search_fields = ("name", "creator_name")
    readonly_fields = ("created_at", "updated_at", "deleted_at")


@admin.register(UserAccessWorkspace)
class UserAccessWorkspaceAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "workspace", "role", "created_at", "updated_at")
    list_filter = ("role",)
    search_fields = ("user__email", "workspace__name")
    readonly_fields = ("created_at", "updated_at")
