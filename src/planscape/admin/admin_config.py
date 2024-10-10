from django.contrib import admin
from django.core.handlers.wsgi import WSGIRequest


class PlanscapeAdmin(admin.AdminSite):
    def has_permission(self, request: WSGIRequest) -> bool:
        return request.user.is_active and request.user.is_superuser
