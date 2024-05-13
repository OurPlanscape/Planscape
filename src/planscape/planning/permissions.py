from django.shortcuts import get_object_or_404
from planscape.permissions import PlanscapePermission
from collaboration.permissions import (
    PlanningAreaPermission,
    ScenarioPermission,
)
from planning.models import PlanningArea


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
