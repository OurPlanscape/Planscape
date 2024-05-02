from django.shortcuts import get_object_or_404
from rest_framework.permissions import BasePermission
from collaboration.permissions import (
    PlanningAreaPermission,
    ScenarioPermission,
    CheckPermissionMixin,
)
from planning.models import PlanningArea


class PlanscapePermission(BasePermission):

    model = None

    def has_permission(self, request, view):
        return self.is_authenticated(request)

    def is_authenticated(self, request):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, object):
        if view.action == "update" or view.action == "partial_update":
            return self.permission_set.can_change(request.user, object)
        if view.action == "destroy":
            return self.permission_set.can_remove(request.user, object)


class PlanningAreaViewPermission(PlanscapePermission):
    permission_set = PlanningAreaPermission


class ScenarioViewPermission(PlanscapePermission):
    permission_set = ScenarioPermission

    def has_permission(self, request, view):
        planningarea_pk = view.kwargs.get("planningarea_pk")
        planningarea = get_object_or_404(PlanningArea, id=planningarea_pk)
        if view.action == "create" and planningarea_pk:
            return PlanningAreaPermission.can_add_scenario(request.user, planningarea)
        if view.action == "list" and planningarea_pk:
            return PlanningAreaPermission.can_view(request.user, planningarea)
        return PlanningAreaPermission.can_change(request.user, planningarea)
