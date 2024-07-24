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

        match view.action:
            case "update" | "partial_update":
                return self.permission_set.can_change(request.user, object)
            case "destroy":
                return self.permission_set.can_remove(request.user, object)
            case _:
                return True
