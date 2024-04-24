from rest_framework.permissions import BasePermission


class PlanningUserPermission(BasePermission):
    def has_permission(self, request, view):
        authenticated = self.is_authenticated(request)
        if not authenticated:
            return False
        return self.has_object_permission(request, view)

    def is_authenticated(self, request):
        return request.user.is_authenticated

    def has_object_permission(self, request, view):
        # TODO: DONT COMMIT THIS WITHOUT INCLUDING OUR PERMS
        return True
