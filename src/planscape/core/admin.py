from django.contrib import admin

from core.models import RestoreBackTrack


class RestoreBackTrackAdmin(admin.ModelAdmin):
    list_display = ("id", "file_name", "status", "started_at", "finished_at")
    list_filter = ("status",)
    search_fields = ("file_name",)
    ordering = ("-started_at",)
    readonly_fields = ("started_at",)


admin.site.register(RestoreBackTrack, RestoreBackTrackAdmin)
