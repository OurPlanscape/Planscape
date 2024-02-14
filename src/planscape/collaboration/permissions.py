from collaboration.models import Collaborator, Permissions
from collaboration.utils import check_for_permission, is_creator
from planning.models import PlanningArea, Scenario
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
        try:
            return check_for_permission(user.id, planning_area, "view_planningarea")
        except (Collaborator.DoesNotExist, Permissions.DoesNotExist):
            return False

    @staticmethod
    def can_add(user: User, planning_area: PlanningArea):
        return is_creator(user, planning_area)

    @staticmethod
    def can_change(user: User, planning_area: PlanningArea):
        return is_creator(user, planning_area)

    @staticmethod
    def can_remove(user: User, planning_area: PlanningArea):
        return is_creator(user, planning_area)


class CollaboratorPermission(CheckPermissionMixin):
    @staticmethod
    def can_view(user: User, planning_area: PlanningArea):
        if is_creator(user, planning_area):
            return True
        try:
            return check_for_permission(user.id, planning_area, "view_collaborator")
        except (Collaborator.DoesNotExist, Permissions.DoesNotExist):
            return False

    @staticmethod
    def can_add(user: User, planning_area: PlanningArea):
        if is_creator(user, planning_area):
            return True
        try:
            return check_for_permission(user.id, planning_area, "add_collaborator")
        except (Collaborator.DoesNotExist, Permissions.DoesNotExist):
            return False

    @staticmethod
    def can_change(user: User, planning_area: PlanningArea):
        if is_creator(user, planning_area):
            return True
        try:
            return check_for_permission(user.id, planning_area, "change_collaborator")
        except (Collaborator.DoesNotExist, Permissions.DoesNotExist):
            return False

    @staticmethod
    def can_delete(user: User, planning_area: PlanningArea):
        if is_creator(user, planning_area):
            return True
        try:
            return check_for_permission(user.id, planning_area, "delete_collaborator")
        except (Collaborator.DoesNotExist, Permissions.DoesNotExist):
            return False


class ScenarioPermission(CheckPermissionMixin):
    @staticmethod
    def can_view(user: User, planning_area: PlanningArea):
        if is_creator(user, planning_area):
            return True
        try:
            return check_for_permission(user.id, planning_area, "view_scenario")
        except (Collaborator.DoesNotExist, Permissions.DoesNotExist):
            return False

    @staticmethod
    def can_add(user: User, planning_area: PlanningArea):
        if is_creator(user, planning_area):
            return True
        try:
            return check_for_permission(user.id, planning_area, "add_scenario")
        except (Collaborator.DoesNotExist, Permissions.DoesNotExist):
            return False

    @staticmethod
    def can_change(user: User, planning_area: PlanningArea, scenario: Scenario):
        if is_creator(user, planning_area) or scenario.user.pk == user.pk:
            return True
        try:
            return check_for_permission(user.id, planning_area, "change_scenario")
        except (Collaborator.DoesNotExist, Permissions.DoesNotExist):
            return False

    @staticmethod
    def can_delete(user: User, planning_area: PlanningArea, scenario: Scenario):
        return is_creator(user, planning_area) or scenario.user.pk == user.pk
