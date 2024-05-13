from rest_framework.permissions import BasePermission


class PlanscapePermission(BasePermission):
    permission_set = None

    def has_permission(self, request, view):
        return self.is_authenticated(request)

    def is_authenticated(self, request):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, object):
        if not self.permission_set:
            return False
        if view.action == "update" or view.action == "partial_update":
            return self.permission_set.can_change(request.user, object)
        if view.action == "destroy":
            return self.permission_set.can_remove(request.user, object)
