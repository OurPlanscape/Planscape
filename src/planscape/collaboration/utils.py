from collaboration.models import Collaborator, Role
from planning.models import PlanningArea


def get_collaborator(user_id, planning_area_id):
    return Collaborator.objects.get(
        collaborator_id=user_id,
        content_type_id=planning_area_id,
        object_pk="planningarea",
    )


def is_creator(user, planning_area: PlanningArea):
    return planning_area.user == user


def is_owner(user, planning_area: PlanningArea):
    try:
        entry = get_collaborator(user.id, planning_area.id)
        return entry.role == Role.OWNER
    except Collaborator.DoesNotExist:
        return False


def is_collaborator(user, planning_area: PlanningArea):
    try:
        entry = get_collaborator(user.id, planning_area.id)
        return entry.role == Role.COLLABORATOR
    except Collaborator.DoesNotExist:
        return False


def is_viewer(user, planning_area: PlanningArea):
    try:
        entry = get_collaborator(user.id, planning_area.id)
        return entry.role == Role.VIEWER
    except Collaborator.DoesNotExist:
        return False
