from django.contrib import admin
from django.contrib import messages
from django.core.handlers.wsgi import WSGIRequest
from django.http import HttpResponseRedirect
from django.urls import path, reverse

from core.backup_state import (
    BACKUP_STATE_IDLE,
    BACKUP_STATE_QUEUED,
    get_backup_status,
    is_backup_active,
    set_backup_status,
)
from core.tasks import generate_backup_data_task


class PlanscapeAdmin(admin.AdminSite):
    def has_permission(self, request: WSGIRequest) -> bool:
        return request.user.is_active and request.user.is_superuser

    def get_urls(self):
        return [
            path(
                "backup-data/trigger/",
                self.admin_view(self.trigger_backup_data_view),
                name="trigger_backup_data",
            ),
            *super().get_urls(),
        ]

    def each_context(self, request: WSGIRequest):
        context = super().each_context(request)
        context.update(
            {
                "backup_status": get_backup_status(),
                "backup_in_progress": is_backup_active(),
                "trigger_backup_data_url": reverse("admin:trigger_backup_data"),
            }
        )
        return context

    def trigger_backup_data_view(self, request: WSGIRequest) -> HttpResponseRedirect:
        if request.method != "POST":
            messages.error(request, "Backup must be triggered with a POST request.")
            return HttpResponseRedirect(reverse("admin:index"))

        if is_backup_active():
            messages.warning(request, "A backup is already queued or running.")
            return HttpResponseRedirect(reverse("admin:index"))

        set_backup_status(BACKUP_STATE_QUEUED)
        try:
            task = generate_backup_data_task.delay()
        except Exception:
            set_backup_status(BACKUP_STATE_IDLE)
            raise

        set_backup_status(BACKUP_STATE_QUEUED, task_id=task.id)
        messages.success(request, "Backup queued.")
        return HttpResponseRedirect(reverse("admin:index"))
