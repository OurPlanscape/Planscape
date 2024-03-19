from collaboration.utils import check_for_permission, is_creator
from planning.models import PlanningArea, PlanningAreaNote, Scenario
from django.contrib.auth.models import User


class CheckPermissionMixin:
    @staticmethod
    def can_view():
        raise NotImplementedError("Subclasses must implement can_add.")

    @staticmethod
    def can_add():
        raise NotImplementedError("Subclasses must implement can_add.")

    @staticmethod
    def can_change():
        raise NotImplementedError("Subclasses must implement can_add.")

    @staticmethod
    def can_remove():
        raise NotImplementedError("Subclasses must implement can_remove.")


class PlanningAreaPermission(CheckPermissionMixin):
    @staticmethod
    def can_view(user: User, planning_area: PlanningArea):
        if is_creator(user, planning_area):
            return True

        return check_for_permission(user.id, planning_area, "view_planningarea")

    @staticmethod
    def can_add(user: User, planning_area: PlanningArea):
        return is_creator(user, planning_area)

    @staticmethod
    def can_change(user: User, planning_area: PlanningArea):
        return is_creator(user, planning_area)

    @staticmethod
    def can_remove(user: User, planning_area: PlanningArea):
        return is_creator(user, planning_area)

    @staticmethod
    def can_add_scenario(user: User, planning_area: PlanningArea):
        if is_creator(user, planning_area):
            return True

        return check_for_permission(user.id, planning_area, "add_scenario")


class PlanningAreaNotePermission(CheckPermissionMixin):
    @staticmethod
    def can_view(user: User, planning_area_note: PlanningAreaNote):
        if is_creator(user, planning_area_note.planning_area):
            return True
        return check_for_permission(
            user.id, planning_area_note.planning_area, "view_planningarea"
        )

    @staticmethod
    def can_add(user: User, planning_area_note: PlanningAreaNote):
        planning_area = None
        if isinstance(planning_area_note, PlanningAreaNote):
            planning_area = planning_area_note.planning_area
        else:
            planning_area = planning_area_note["planning_area"]

        if is_creator(user, planning_area):
            return True
        return check_for_permission(user.id, planning_area, "view_planningarea")

    @staticmethod
    def can_change(user: User, planning_area_note: PlanningAreaNote):
        return is_creator(user, planning_area_note.planning_area) or is_creator(
            user, planning_area_note
        )

    ##creators of the planning area or authors of notes can remove a note
    @staticmethod
    def can_remove(user: User, planning_area_note: PlanningAreaNote):
        return is_creator(user, planning_area_note.planning_area) or is_creator(
            user, planning_area_note
        )


class CollaboratorPermission(CheckPermissionMixin):
    @staticmethod
    def can_view(user: User, planning_area: PlanningArea):
        if is_creator(user, planning_area):
            return True

        return check_for_permission(user.id, planning_area, "view_collaborator")

    @staticmethod
    def can_add(user: User, planning_area: PlanningArea):
        if is_creator(user, planning_area):
            return True

        return check_for_permission(user.id, planning_area, "add_collaborator")

    @staticmethod
    def can_change(user: User, planning_area: PlanningArea):
        if is_creator(user, planning_area):
            return True

        return check_for_permission(user.id, planning_area, "change_collaborator")

    @staticmethod
    def can_delete(user: User, planning_area: PlanningArea):
        if is_creator(user, planning_area):
            return True

        return check_for_permission(user.id, planning_area, "delete_collaborator")


class ScenarioPermission(CheckPermissionMixin):
    @staticmethod
    def can_view(user: User, scenario: Scenario):
        if is_creator(user, scenario.planning_area):
            return True

        return check_for_permission(user.id, scenario.planning_area, "view_scenario")

    @staticmethod
    def can_add(user: User, scenario: Scenario):
        if is_creator(user, scenario.planning_area):
            return True

        return check_for_permission(user.id, scenario.planning_area, "add_scenario")

    @staticmethod
    def can_change(user: User, scenario: Scenario):
        if is_creator(user, scenario.planning_area) or scenario.user.pk == user.pk:
            return True

        return check_for_permission(user.id, scenario.planning_area, "change_scenario")

    @staticmethod
    def can_delete(user: User, scenario: Scenario):
        return is_creator(user, scenario.planning_area) or scenario.user.pk == user.pk
