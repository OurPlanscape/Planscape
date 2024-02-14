from collaboration.models import Collaborator, Permissions
from planning.models import PlanningArea, Scenario
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType


User = get_user_model()


def is_creator(user: User, planning_area: PlanningArea):
    return planning_area.user.pk == user.pk


def get_collaborator(user_id, planning_area_id):
    planning_area_type = ContentType.objects.get(
        app_label="planning", model="planningarea"
    )

    return Collaborator.objects.get(
        collaborator_id=user_id,
        content_type_id=planning_area_type,
        object_pk=planning_area_id,
    )


def lookup_permission(user_id, planning_area_id, permission):
    entry = get_collaborator(user_id, planning_area_id)
    Permissions.objects.get(role=entry.role, permission=permission)
    return True


def can_view_planning_area(user: User, planning_area: PlanningArea):
    if is_creator(user, planning_area):
        return True

    try:
        return lookup_permission(user.id, planning_area.id, "view_planningarea")
    except (Collaborator.DoesNotExist, Permissions.DoesNotExist):
        return False


def can_view_scenario(user: User, planning_area: PlanningArea):
    if is_creator(user, planning_area):
        return True

    try:
        return lookup_permission(user.id, planning_area.id, "view_scenario")
    except (Collaborator.DoesNotExist, Permissions.DoesNotExist):
        return False


def can_add_scenario(user: User, planning_area: PlanningArea):
    if is_creator(user, planning_area):
        return True
    try:
        return lookup_permission(user.id, planning_area.id, "add_scenario")
    except (Collaborator.DoesNotExist, Permissions.DoesNotExist):
        return False


def can_archive_scenario(user: User, planning_area: PlanningArea, scenario: Scenario):
    if is_creator(user, planning_area) or scenario.user.pk == user.pk:
        return True
    try:
        return lookup_permission(user.id, planning_area.id, "change_scenario")
    except (Collaborator.DoesNotExist, Permissions.DoesNotExist):
        return False


def can_view_collaborators(user: User, planning_area: PlanningArea):
    if is_creator(user, planning_area):
        return True
    try:
        return lookup_permission(user.id, planning_area.id, "view_collaborator")
    except (Collaborator.DoesNotExist, Permissions.DoesNotExist):
        return False


def can_add_collaborators(user: User, planning_area: PlanningArea):
    if is_creator(user, planning_area):
        return True
    try:
        return lookup_permission(user.id, planning_area.id, "add_collaborator")
    except (Collaborator.DoesNotExist, Permissions.DoesNotExist):
        return False


def can_change_collaborators(user: User, planning_area: PlanningArea):
    if is_creator(user, planning_area):
        return True
    try:
        return lookup_permission(user.id, planning_area.id, "change_collaborator")
    except (Collaborator.DoesNotExist, Permissions.DoesNotExist):
        return False


def can_delete_collaborators(user: User, planning_area: PlanningArea):
    if is_creator(user, planning_area):
        return True
    try:
        return lookup_permission(user.id, planning_area.id, "delete_collaborator")
    except (Collaborator.DoesNotExist, Permissions.DoesNotExist):
        return False
