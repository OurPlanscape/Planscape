from collaboration.models import Collaborator, Permissions, Role
from planning.models import PlanningArea, Scenario
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType


User = get_user_model()


def is_creator(user: User, planning_area: PlanningArea):
    return planning_area.user.pk == user.pk


def is_owner(collaborator: Collaborator):
    return collaborator.role == Role.OWNER


def is_collaborator(collaborator: Collaborator):
    return collaborator.role == Role.COLLABORATOR


def is_viewer(collaborator: Collaborator):
    return collaborator.role == Role.VIEWER


def get_collaborator(user_id, planning_area_id):
    planning_area_type = ContentType.objects.get(
        app_label="planning", model="planningarea"
    )

    return Collaborator.objects.get(
        collaborator_id=user_id,
        content_type_id=planning_area_type,
        object_pk=planning_area_id,
    )


def can_view_planning_area(user: User, planning_area: PlanningArea):
    if is_creator(user, planning_area):
        return True

    try:
        entry = get_collaborator(user.id, planning_area.id)
        return is_viewer(entry) or is_collaborator(entry) or is_owner(entry)
    except Collaborator.DoesNotExist:
        return False


def can_view_scenario(user: User, planning_area: PlanningArea):
    if is_creator(user, planning_area):
        return True

    try:
        entry = get_collaborator(user.id, planning_area.id)
        return is_viewer(entry) or is_collaborator(entry) or is_owner(entry)
    except Collaborator.DoesNotExist:
        return False


def can_add_scenario(user: User, planning_area: PlanningArea):
    if is_creator(user, planning_area):
        return True
    try:
        entry = get_collaborator(user.id, planning_area.id)
        return is_collaborator(entry) or is_owner(entry)
    except Collaborator.DoesNotExist:
        return False


# todo consider scenario owner
def can_archive_scenario(user: User, planning_area: PlanningArea, scenario: Scenario):
    if is_creator(user, planning_area):
        return True
    try:
        entry = get_collaborator(user.id, planning_area.id)
        return is_collaborator(entry) or is_owner(entry)
    except Collaborator.DoesNotExist:
        return False


def can_view_collaborators(user: User, planning_area: PlanningArea):
    if is_creator(user, planning_area):
        return True
    try:
        entry = get_collaborator(user.id, planning_area.id)
        return is_owner(entry)
    except Collaborator.DoesNotExist:
        return False


def can_add_collaborators(user: User, planning_area: PlanningArea):
    if is_creator(user, planning_area):
        return True
    try:
        entry = get_collaborator(user.id, planning_area.id)
        return is_owner(entry)
    except Collaborator.DoesNotExist:
        return False


def can_change_collaborators(user: User, planning_area: PlanningArea):
    if is_creator(user, planning_area):
        return True
    try:
        entry = get_collaborator(user.id, planning_area.id)
        return is_owner(entry)
    except Collaborator.DoesNotExist:
        return False


def can_delete_collaborators(user: User, planning_area: PlanningArea):
    if is_creator(user, planning_area):
        return True
    try:
        entry = get_collaborator(user.id, planning_area.id)
        return is_owner(entry)
    except Collaborator.DoesNotExist:
        return False
