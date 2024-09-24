from collaboration.utils import check_for_permission, is_creator
from impacts.models import TreatmentPlan, TreatmentPrescription
from planning.models import (
    ProjectAreaNote,
    ProjectArea,
)
from django.contrib.auth.models import User
from planscape.typing import TUser
from planning.models import (
    TPlanningArea,
    TPlanningAreaNote,
    TScenario,
)
from django.contrib.auth.models import AbstractUser


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
    def can_view(user: AbstractUser, planning_area: TPlanningArea):
        if is_creator(user, planning_area):
            return True

        return check_for_permission(user.pk, planning_area, "view_planningarea")

    @staticmethod
    def can_add(user: TUser, planning_area: TPlanningArea):
        return is_creator(user, planning_area)

    @staticmethod
    def can_change(user: TUser, planning_area: TPlanningArea):
        return is_creator(user, planning_area)

    @staticmethod
    def can_remove(user: TUser, planning_area: TPlanningArea):
        return is_creator(user, planning_area)

    @staticmethod
    def can_add_scenario(user: TUser, planning_area: TPlanningArea):
        if is_creator(user, planning_area):
            return True

        return check_for_permission(user.id, planning_area, "add_scenario")


class PlanningAreaNotePermission(CheckPermissionMixin):
    @staticmethod
    def can_view(user: TUser, planning_area_note: TPlanningAreaNote):
        if is_creator(user, planning_area_note.planning_area):
            return True
        return check_for_permission(
            user.id,
            planning_area_note.planning_area,
            "view_planningarea",
        )

    @staticmethod
    def can_add(user: TUser, planning_area_note: TPlanningAreaNote):
        planning_area: TPlanningArea = planning_area_note.planning_area
        if is_creator(user, planning_area):
            return True
        return check_for_permission(
            user.id,
            planning_area,
            "view_planningarea",
        )

    @staticmethod
    def can_change(user: TUser, planning_area_note: TPlanningAreaNote):
        return is_creator(user, planning_area_note.planning_area) or is_creator(
            user, planning_area_note
        )

    # creators of the planning area or authors of notes can remove a note
    @staticmethod
    def can_remove(user: TUser, planning_area_note: TPlanningAreaNote):
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
    def can_view(user: TUser, planning_area: TPlanningArea) -> bool:
        if is_creator(user, planning_area):
            return True

        return check_for_permission(
            user.id,
            planning_area,
            "view_collaborator",
        )

    @staticmethod
    def can_add(user: TUser, planning_area: TPlanningArea) -> bool:
        if is_creator(user, planning_area):
            return True

        return check_for_permission(
            user.id,
            planning_area,
            "add_collaborator",
        )

    @staticmethod
    def can_change(user: TUser, planning_area: TPlanningArea) -> bool:
        if is_creator(user, planning_area):
            return True

        return check_for_permission(
            user.id,
            planning_area,
            "change_collaborator",
        )

    @staticmethod
    def can_remove(user: TUser, planning_area: TPlanningArea) -> bool:
        if is_creator(user, planning_area):
            return True

        return check_for_permission(
            user.id,
            planning_area,
            "delete_collaborator",
        )


class ScenarioPermission(CheckPermissionMixin):
    @staticmethod
    def can_view(user: TUser, scenario: TScenario):
        if is_creator(user, scenario.planning_area):
            return True

        return check_for_permission(
            user.id,
            scenario.planning_area,
            "view_scenario",
        )

    @staticmethod
    def can_add(user: TUser, scenario: TScenario):
        if is_creator(user, scenario.planning_area):
            return True

        return check_for_permission(user.id, scenario.planning_area, "add_scenario")

    @staticmethod
    def can_change(user: TUser, scenario: TScenario):
        if is_creator(user, scenario.planning_area) or scenario.user.pk == user.pk:
            return True

        return check_for_permission(user.id, scenario.planning_area, "change_scenario")

    @staticmethod
    def can_remove(user: TUser, scenario: TScenario):
        planning_creator = is_creator(user, scenario.planning_area)
        scenario_creator = scenario.user.pk == user.pk
        return any([planning_creator, scenario_creator])


# TODO: not sure if the ProjectAreaNoteViewPermission needs this
# or if we can just make use of PlanningArea perms here
class ProjectAreaNotePermission(CheckPermissionMixin):
    @staticmethod
    def can_view(user: User, project_area_note: ProjectAreaNote):
        # depends on planning_area view permission
        planning_area = project_area_note.project_area.scenario.planning_area
        if is_creator(user, planning_area):
            return True
        return check_for_permission(user.id, planning_area, "view_planningarea")

    @staticmethod
    def can_add(user: User, project_area: ProjectArea):
        planning_area = project_area.scenario.planning_area
        if is_creator(user, planning_area):
            return True
        return check_for_permission(user.id, planning_area, "view_planningarea")

    # TODO: should the owner of the project area be able to remove notes, also?
    @staticmethod
    def can_remove(user: User, project_area_note: ProjectAreaNote):
        planning_area = project_area_note.project_area.scenario.planning_area
        return is_creator(user, planning_area) or is_creator(user, project_area_note)
