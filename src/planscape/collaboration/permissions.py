from climate_foresight.models import ClimateForesightRun
from django.contrib.auth.models import AbstractUser
from planning.models import PlanningArea, PlanningAreaNote, Scenario

from collaboration.utils import check_for_permission, is_creator


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
        return is_creator(user, planning_area) or check_for_permission(
            user.pk, planning_area, "change_planning_area"
        )

    @staticmethod
    def can_remove(user: AbstractUser, planning_area: PlanningArea):
        return is_creator(user, planning_area)

    @staticmethod
    def can_add_scenario(user: AbstractUser, planning_area: PlanningArea):
        if is_creator(user, planning_area):
            return True

        return check_for_permission(user.pk, planning_area, "add_scenario")

    @staticmethod
    def can_run_climate(user: AbstractUser, planning_area: PlanningArea):
        if is_creator(user, planning_area):
            return True

        return check_for_permission(user.pk, planning_area, "run_climate_foresight")


class PlanningAreaNotePermission(CheckPermissionMixin):
    @staticmethod
    def can_view(user: AbstractUser, planning_area_note: PlanningAreaNote):
        if is_creator(user, planning_area_note.planning_area):
            return True
        return check_for_permission(
            user.pk,
            planning_area_note.planning_area,
            "view_planningarea",
        )

    @staticmethod
    def can_add(user: AbstractUser, planning_area_note: PlanningAreaNote):
        planning_area: PlanningArea = planning_area_note.planning_area
        if is_creator(user, planning_area):
            return True
        return check_for_permission(
            user.pk,
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
            user.pk,
            planning_area,
            "view_collaborator",
        )

    @staticmethod
    def can_add(user: AbstractUser, planning_area: PlanningArea) -> bool:
        if is_creator(user, planning_area):
            return True

        return check_for_permission(
            user.pk,
            planning_area,
            "add_collaborator",
        )

    @staticmethod
    def can_change(user: AbstractUser, planning_area: PlanningArea) -> bool:
        if is_creator(user, planning_area):
            return True

        return check_for_permission(
            user.pk,
            planning_area,
            "change_collaborator",
        )

    @staticmethod
    def can_remove(user: AbstractUser, planning_area: PlanningArea) -> bool:
        if is_creator(user, planning_area):
            return True

        return check_for_permission(
            user.pk,
            planning_area,
            "delete_collaborator",
        )


class ScenarioPermission(CheckPermissionMixin):
    @staticmethod
    def can_view(user: AbstractUser, scenario: Scenario):
        planning_creator = is_creator(user, scenario.planning_area)
        scenario_creator = is_creator(user, scenario)
        has_permission = check_for_permission(
            user.pk,
            scenario.planning_area,
            "view_scenario",
        )

        return any([planning_creator, scenario_creator, has_permission])

    @staticmethod
    def can_add(user: AbstractUser, scenario: Scenario):
        if is_creator(user, scenario.planning_area):
            return True

        return check_for_permission(user.pk, scenario.planning_area, "add_scenario")

    @staticmethod
    def can_change(user: AbstractUser, scenario: Scenario):
        planning_creator = is_creator(user, scenario.planning_area)
        scenario_creator = is_creator(user, scenario)
        has_permission = check_for_permission(
            user.pk, scenario.planning_area, "change_scenario"
        )

        return any([planning_creator, scenario_creator, has_permission])

    @staticmethod
    def can_remove(user: AbstractUser, scenario: Scenario):
        planning_creator = is_creator(user, scenario.planning_area)
        scenario_creator = is_creator(user, scenario)
        has_permission = check_for_permission(
            user.pk, scenario.planning_area, "remove_scenario"
        )

        return any([planning_creator, scenario_creator, has_permission])


class ClimateForesightPermission(CheckPermissionMixin):
    @staticmethod
    def can_view(user: AbstractUser, run: ClimateForesightRun) -> bool:
        planning_creator = is_creator(user, run.planning_area)
        run_creator = is_creator(user, run)
        has_permission = check_for_permission(
            user.pk,
            run.planning_area,
            "view_climate_foresight",
        )

        return any([planning_creator, run_creator, has_permission])

    @staticmethod
    def can_add(user: AbstractUser, run: ClimateForesightRun) -> bool:
        if is_creator(user, run.planning_area):
            return True

        return check_for_permission(user.pk, run.planning_area, "run_climate_foresight")

    @staticmethod
    def can_change(user: AbstractUser, run: ClimateForesightRun) -> bool:
        return False

    @staticmethod
    def can_remove(user: AbstractUser, run: ClimateForesightRun) -> bool:
        planning_creator = is_creator(user, run.planning_area)
        run_creator = is_creator(user, run)
        has_permission = check_for_permission(
            user.pk, run.planning_area, "remove_climate_foresight"
        )

        return any([planning_creator, run_creator, has_permission])
