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
        if not self.is_authenticated(request):
            return False
        match view.action:
            case "create":
                pa_id = request.data.get("planning_area") or None
                if not pa_id:
                    return False
                planning_area = PlanningArea.objects.get("planning_area")
                return PlanningAreaPermission.can_add_scenario(
                    request.user, planning_area
                )
            case _:
                # scenario filters this on the queryset
                return True

    def has_object_permission(self, request, view, object):
        planning_area = object.planning_area
        return PlanningAreaPermission.can_change(request.user, planning_area)
