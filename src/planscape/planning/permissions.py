from planscape.permissions import PlanscapePermission
from collaboration.permissions import (
    PlanningAreaPermission,
    ScenarioPermission,
    ProjectAreaNotePermission,
)
from planning.models import PlanningArea, ProjectArea


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
        match view.action:
            case "create":
                project_area_id = request.data.get("project_area") or None
                if not project_area_id:
                    return False
                project_area = ProjectArea.objects.get(id=project_area_id)
                return ProjectAreaNotePermission.can_add(request.user, project_area)
            case _:
                # scenario filters this on the queryset
                return True

    def has_object_permission(self, request, view, object):
        project_area = object.project_area
        print(f" We have a project_area? {project_area}")
        print(
            f" We are trying to get object permission for this view action: {view.action}"
        )

        match view.action:
            case "update" | "partial_update":
                # TODO: we should never get here for a note
                method = ProjectAreaNotePermission.can_change
            case "destroy":
                print(f"we got here, were trying to remove something...")
                method = ProjectAreaNotePermission.can_remove
            case _:
                method = ProjectAreaNotePermission.can_view
        return method(request.user, project_area)
