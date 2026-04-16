from django.contrib import admin
from django.contrib import messages
from django.core.handlers.wsgi import WSGIRequest
from django.http import HttpResponseRedirect
from django.urls import path, reverse

from core.backup_state import (
    BACKUP_STATE_IDLE,
    BACKUP_STATE_QUEUED,
    get_backup_status,
    get_restore_status,
    is_backup_active,
    is_restore_active,
    set_backup_status,
    set_restore_status,
)
from core.tasks import generate_backup_data_task, load_latest_catalog_backup_task


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
            path(
                "restore-data/trigger/",
                self.admin_view(self.trigger_restore_data_view),
                name="trigger_restore_data",
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
                "restore_status": get_restore_status(),
                "restore_in_progress": is_restore_active(),
                "trigger_restore_data_url": reverse("admin:trigger_restore_data"),
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

    def trigger_restore_data_view(self, request: WSGIRequest) -> HttpResponseRedirect:
        if request.method != "POST":
            messages.error(request, "Restore must be triggered with a POST request.")
            return HttpResponseRedirect(reverse("admin:index"))

        if is_restore_active():
            messages.warning(request, "A restore is already queued or running.")
            return HttpResponseRedirect(reverse("admin:index"))

        set_restore_status(BACKUP_STATE_QUEUED)
        try:
            task = load_latest_catalog_backup_task.delay()
        except Exception:
            set_restore_status(BACKUP_STATE_IDLE)
            raise

        set_restore_status(BACKUP_STATE_QUEUED, task_id=task.id)
        messages.success(request, "Restore queued.")
        return HttpResponseRedirect(reverse("admin:index"))
