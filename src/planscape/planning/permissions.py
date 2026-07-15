from collaboration.permissions import PlanningAreaPermission, ScenarioPermission
from planscape.permissions import PlanscapePermission

from planning.models import PlanningArea


class PlanningAreaViewPermission(PlanscapePermission):
    permission_set = PlanningAreaPermission


class ScenarioViewPermission(PlanscapePermission):
    permission_set = ScenarioPermission

    def has_permission(self, request, view):
        if not self.is_authenticated(request):
            return False
        match view.action:
            case "create" | "create_draft":
                pa_id = request.data.get("planning_area") or None
                if not pa_id:
                    return False
                planning_area = PlanningArea.objects.get(id=pa_id)
                return PlanningAreaPermission.can_add_scenario(
                    request.user, planning_area
                )
            case _:
                # scenario filters this on the queryset
                return super().has_permission(request, view)

    def has_object_permission(self, request, view, obj):
        match view.action:
            case "run_report":
                return ScenarioPermission.can_add(request.user, obj)
            case _:
                return super().has_object_permission(request, view, obj)
