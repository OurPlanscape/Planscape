from planscape.permissions import PlanscapePermission
from collaboration.permissions import (
    PlanningAreaPermission,
    ScenarioPermission,
    ProjectAreaNotePermission,
)
from planning.models import PlanningArea, ProjectArea
from rest_framework.exceptions import ValidationError


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
                planning_area = PlanningArea.objects.get(id=pa_id)
                return PlanningAreaPermission.can_add_scenario(
                    request.user, planning_area
                )
            case _:
                # scenario filters this on the queryset
                return True

    def has_object_permission(self, request, view, object):
        planning_area = object.planning_area
        match view.action:
            case "update" | "partial_update":
                method = PlanningAreaPermission.can_change
            case "destroy":
                method = PlanningAreaPermission.can_remove
            case _:
                method = PlanningAreaPermission.can_view
        return method(request.user, planning_area)


class ProjectAreaNoteViewPermission(PlanscapePermission):
    permission_set = ProjectAreaNotePermission

    def has_permission(self, request, view):
        if not self.is_authenticated(request):
            return False

        project_area_id = request.data.get("project_area") or None
        match view.action:
            case "create":
                if not project_area_id:
                    return False
                project_area = ProjectArea.objects.get(id=project_area_id)
                return ProjectAreaNotePermission.can_add(request.user, project_area)

            case "list":
                project_area_id = request.query_params.get("project_area_pk") or None
                if not project_area_id:
                    raise ValidationError(f"Missing required project_area_pk")
                project_area = ProjectArea.objects.select_related(
                    "scenario", "scenario__planning_area"
                ).get(id=project_area_id)
                planning_area = project_area.scenario.planning_area
                return PlanningAreaPermission.can_view(request.user, planning_area)

            case "destroy" | "retrieve":
                # fallthrough to has_object_permissions
                return True

            case "update" | "partial_update" | _:
                return False  # operations unsupported

    def has_object_permission(self, request, view, object):
        match view.action:
            case "destroy":
                method = ProjectAreaNotePermission.can_remove
            case _:
                method = ProjectAreaNotePermission.can_view
        return method(request.user, object)
