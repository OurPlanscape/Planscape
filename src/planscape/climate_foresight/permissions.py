from collaboration.permissions import ClimateForesightPermission, PlanningAreaPermission
from planning.models import PlanningArea
from planscape.permissions import PlanscapePermission


class ClimateForesightViewPermission(PlanscapePermission):
    permission_set = ClimateForesightPermission

    def has_permission(self, request, view):
        if not self.is_authenticated(request):
            return False
        match view.action:
            case "create":
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
