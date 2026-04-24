from django.conf import settings
from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsCatalogEnvironment(BasePermission):
    """Allows write operations only when running in the catalog environment.

    Safe methods (GET, HEAD, OPTIONS) are always permitted.
    Unsafe methods (POST, PUT, PATCH, DELETE) return 403 outside catalog.
    """

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return settings.ENV == "catalog"
