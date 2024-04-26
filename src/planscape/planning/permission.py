from rest_framework.permissions import BasePermission
from collaboration.permissions import (
    CollaboratorPermission,
    PlanningAreaPermission,
    ScenarioPermission,
)
from django.shortcuts import get_object_or_404
from planning.models import PlanningArea


class UserPermission(BasePermission):
    def has_permission(self, request, view):
        if view.action == "list" and view.get_view_name() == "Scenario List":
            planningarea_pk = view.kwargs.get("planningarea_pk")
            planningarea_obj = get_object_or_404(PlanningArea, id=planningarea_pk)
            can_view = PlanningAreaPermission.can_view(request.user, planningarea_obj)
            return can_view
        return self.is_authenticated(request)

    def is_authenticated(self, request):
        return request.user.is_authenticated
