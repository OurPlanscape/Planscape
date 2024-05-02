from rest_framework.permissions import BasePermission
from collaboration.permissions import (
    PlanningAreaPermission,
    ScenarioPermission,
    CheckPermissionMixin,
)


class PlanscapePermission(BasePermission):

    model = CheckPermissionMixin

    def has_permission(self, request, view):
        return self.is_authenticated(request)

    def is_authenticated(self, request):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, object):
        if view.action == "update":
            return self.permission_set.can_change(request.user, object)
        if view.action == "destroy":
            return self.permission_set.can_remove(request.user, object)


class PlanningAreaViewPermission(PlanscapePermission):
    permission_set = PlanningAreaPermission


class ScenarioViewPermission(PlanscapePermission):
    permission_set = ScenarioPermission
    parent_set = PlanningAreaPermission

    def has_permission(self, request, view):
        print("what about here? What are we checking? {view}")
        print("can I get a permission from here? {request}")
        return super().has_permission(request, view)

    def has_object_permission(self, request, view, object):
        print(f"Do we have a planning area for this? {object.planning_area}")
        if view.action == "update":
            perm = self.permission_set.can_change(request.user, object)
            return perm
        if view.action == "destroy":
            return self.permission_set.can_delete(request.user, object)
        if view.action == "create":
            return self.parent_set.can_add_scenario(request.user, object.planning_area)
