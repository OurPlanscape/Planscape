from rest_framework.permissions import BasePermission


class UserPermission(BasePermission):
    def has_permission(self, request, view):
        return self.is_authenticated(request)

    def is_authenticated(self, request):
        return request.user.is_authenticated
