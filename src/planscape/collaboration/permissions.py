from collaboration.utils import check_for_permission, is_creator
from planning.models import (
    ProjectAreaNote,
    ProjectArea,
)
from django.contrib.auth.models import AbstractUser
from planning.models import (
    PlanningArea,
    PlanningAreaNote,
    Scenario,
)


class CheckPermissionMixin:
    @staticmethod
    def can_view(*args, **kwargs) -> bool:
        raise NotImplementedError("Subclasses must implement can_add.")

    @staticmethod
    def can_add(*args, **kwargs) -> bool:
        raise NotImplementedError("Subclasses must implement can_add.")

    @staticmethod
    def can_change(*args, **kwargs) -> bool:
        raise NotImplementedError("Subclasses must implement can_add.")

    @staticmethod
    def can_remove(*args, **kwargs) -> bool:
        raise NotImplementedError("Subclasses must implement can_remove.")


class PlanningAreaPermission(CheckPermissionMixin):
    @staticmethod
    def can_view(user: AbstractUser, planning_area: PlanningArea):
        if is_creator(user, planning_area):
            return True

        return check_for_permission(user.pk, planning_area, "view_planningarea")

    @staticmethod
    def can_add(user: AbstractUser, planning_area: PlanningArea):
        return is_creator(user, planning_area)

    @staticmethod
    def can_change(user: AbstractUser, planning_area: PlanningArea):
        return is_creator(user, planning_area)

    @staticmethod
    def can_remove(user: AbstractUser, planning_area: PlanningArea):
        return is_creator(user, planning_area)

    @staticmethod
    def can_add_scenario(user: AbstractUser, planning_area: PlanningArea):
        if is_creator(user, planning_area):
            return True

        return check_for_permission(user.id, planning_area, "add_scenario")


class PlanningAreaNotePermission(CheckPermissionMixin):
    @staticmethod
    def can_view(user: AbstractUser, planning_area_note: PlanningAreaNote):
        if is_creator(user, planning_area_note.planning_area):
            return True
        return check_for_permission(
            user.id,
            planning_area_note.planning_area,
            "view_planningarea",
        )

    @staticmethod
    def can_add(user: AbstractUser, planning_area_note: PlanningAreaNote):
        planning_area: PlanningArea = planning_area_note.planning_area
        if is_creator(user, planning_area):
            return True
        return check_for_permission(
            user.id,
            planning_area,
            "view_planningarea",
        )

    @staticmethod
    def can_change(user: AbstractUser, planning_area_note: PlanningAreaNote):
        return is_creator(user, planning_area_note.planning_area) or is_creator(
            user, planning_area_note
        )

    # creators of the planning area or authors of notes can remove a note
    @staticmethod
    def can_remove(user: AbstractUser, planning_area_note: PlanningAreaNote):
        creator_pa = is_creator(
            user,
            planning_area_note.planning_area,
        )
        creator_note = is_creator(
            user,
            planning_area_note,
        )
        return any([creator_pa, creator_note])


class CollaboratorPermission(CheckPermissionMixin):
    @staticmethod
    def can_view(user: AbstractUser, planning_area: PlanningArea) -> bool:
        if is_creator(user, planning_area):
            return True

        return check_for_permission(
            user.id,
            planning_area,
            "view_collaborator",
        )

    @staticmethod
    def can_add(user: AbstractUser, planning_area: PlanningArea) -> bool:
        if is_creator(user, planning_area):
            return True

        return check_for_permission(
            user.id,
            planning_area,
            "add_collaborator",
        )

    @staticmethod
    def can_change(user: AbstractUser, planning_area: PlanningArea) -> bool:
        if is_creator(user, planning_area):
            return True

        return check_for_permission(
            user.id,
            planning_area,
            "change_collaborator",
        )

    @staticmethod
    def can_remove(user: AbstractUser, planning_area: PlanningArea) -> bool:
        if is_creator(user, planning_area):
            return True

        return check_for_permission(
            user.id,
            planning_area,
            "delete_collaborator",
        )


class ScenarioPermission(CheckPermissionMixin):
    @staticmethod
    def can_view(user: AbstractUser, scenario: Scenario):
        if is_creator(user, scenario.planning_area):
            return True

        return check_for_permission(
            user.id,
            scenario.planning_area,
            "view_scenario",
        )

    @staticmethod
    def can_add(user: AbstractUser, scenario: Scenario):
        if is_creator(user, scenario.planning_area):
            return True

        return check_for_permission(user.id, scenario.planning_area, "add_scenario")

    @staticmethod
    def can_change(user: AbstractUser, scenario: Scenario):
        if is_creator(user, scenario.planning_area) or scenario.user.pk == user.pk:
            return True

        return check_for_permission(user.id, scenario.planning_area, "change_scenario")

    @staticmethod
    def can_remove(user: AbstractUser, scenario: Scenario):
        planning_creator = is_creator(user, scenario.planning_area)
        scenario_creator = scenario.user.pk == user.pk
        return any([planning_creator, scenario_creator])


# TODO: not sure if the ProjectAreaNoteViewPermission needs this
# or if we can just make use of PlanningArea perms here
class ProjectAreaNotePermission(CheckPermissionMixin):
    @staticmethod
    def can_view(user: AbstractUser, project_area_note: ProjectAreaNote):
        # depends on planning_area view permission
        planning_area = project_area_note.project_area.scenario.planning_area
        if is_creator(user, planning_area):
            return True
        return check_for_permission(user.id, planning_area, "view_planningarea")

    @staticmethod
    def can_add(user: AbstractUser, project_area: ProjectArea):
        planning_area = project_area.scenario.planning_area
        if is_creator(user, planning_area):
            return True
        return check_for_permission(user.id, planning_area, "view_planningarea")

    # TODO: should the owner of the project area be able to remove notes, also?
    @staticmethod
    def can_remove(user: AbstractUser, project_area_note: ProjectAreaNote):
        planning_area = project_area_note.project_area.scenario.planning_area
        return is_creator(user, planning_area) or is_creator(user, project_area_note)

class TreatmentPlanNotePermission(CheckPermissionMixin):
    @staticmethod
    def can_view(user: AbstractUser, treatment_plan_note: TreatmentPlanNote):
        # depends on planning_area view permission
        planning_area = treatment_plan.scenario.planning_area
        if is_creator(user, planning_area):
            return True
        return check_for_permission(user.id, planning_area, "view_planningarea")

    @staticmethod
    def can_add(user: AbstractUser, treatment_plan: TreatmentPlan):
        planning_area = treatment_plan.scenario.planning_area
        if is_creator(user, planning_area):
            return True
        return check_for_permission(user.id, planning_area, "view_planningarea")

    @staticmethod
    def can_remove(user: AbstractUser, treatment_plan_note: TreatmentPlanNote):
        planning_area = treatment_plan_note.treatment_plan.scenario.planning_area
        return is_creator(user, planning_area) or is_creator(user, treatment_plan_note)