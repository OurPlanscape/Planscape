from collaboration.models import Collaborator, Permissions, Role
from planning.models import PlanningArea, Scenario
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType


User = get_user_model()


def is_creator(user: User, planning_area: PlanningArea):
    return planning_area.user.pk == user.pk


def is_owner(user, planning_area: PlanningArea):
    try:
        entry = get_collaborator(user.id, planning_area.id)
        return collaborator_is_owner(entry)
    except Collaborator.DoesNotExist:
        return False


def is_collaborator(user, planning_area: PlanningArea):
    try:
        entry = get_collaborator(user.id, planning_area.id)
        return collaborator_is_collaborator(entry)
    except Collaborator.DoesNotExist:
        return False


def is_viewer(user, planning_area: PlanningArea):
    try:
        entry = get_collaborator(user.id, planning_area.id)
        return collaborator_is_viewer(entry)
    except Collaborator.DoesNotExist:
        return False


def collaborator_is_owner(collaborator: Collaborator):
    return collaborator.role == Role.OWNER


def collaborator_is_collaborator(collaborator: Collaborator):
    return collaborator.role == Role.COLLABORATOR


def collaborator_is_viewer(collaborator: Collaborator):
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


def canViewPlanningArea(user: User, planning_area: PlanningArea):
    if is_creator(user, planning_area):
        return True

    try:
        entry = get_collaborator(user.id, planning_area.id)
        return (
            collaborator_is_viewer(entry)
            or collaborator_is_collaborator(entry)
            or collaborator_is_owner(entry)
        )
    except Collaborator.DoesNotExist:
        return False


def canViewScenario(user: User, planning_area: PlanningArea, scenario: Scenario):
    # you can view your own scenarios
    # TODO need to add user to scenario
    # if user.id == scenario.user.id:
    #    return True

    if is_creator(user, planning_area):
        return True

    try:
        entry = get_collaborator(user.id, planning_area.id)
        return (
            collaborator_is_viewer(entry)
            or collaborator_is_collaborator(entry)
            or collaborator_is_owner(entry)
        )
    except Collaborator.DoesNotExist:
        return False


def canAddScenario(user: User, planning_area: PlanningArea):
    if is_creator(user, planning_area):
        return True
    try:
        entry = get_collaborator(user.id, planning_area.id)
        return collaborator_is_collaborator(entry) or collaborator_is_owner(entry)
    except Collaborator.DoesNotExist:
        return False


def canArchiveScenario(user: User, planning_area: PlanningArea):
    if is_creator(user, planning_area):
        return True
    try:
        entry = get_collaborator(user.id, planning_area.id)
        return collaborator_is_collaborator(entry) or collaborator_is_owner(entry)
    except Collaborator.DoesNotExist:
        return False


def canViewCollaborators(user: User, planning_area: PlanningArea):
    if is_creator(user, planning_area):
        return True
    try:
        entry = get_collaborator(user.id, planning_area.id)
        return collaborator_is_owner(entry)
    except Collaborator.DoesNotExist:
        return False


def canAddCollaborators(user: User, planning_area: PlanningArea):
    if is_creator(user, planning_area):
        return True
    try:
        entry = get_collaborator(user.id, planning_area.id)
        return collaborator_is_owner(entry)
    except Collaborator.DoesNotExist:
        return False


def canChangeCollaborators(user: User, planning_area: PlanningArea):
    if is_creator(user, planning_area):
        return True
    try:
        entry = get_collaborator(user.id, planning_area.id)
        return collaborator_is_owner(entry)
    except Collaborator.DoesNotExist:
        return False


def canDeleteCollaborators(user: User, planning_area: PlanningArea):
    if is_creator(user, planning_area):
        return True
    try:
        entry = get_collaborator(user.id, planning_area.id)
        return collaborator_is_owner(entry)
    except Collaborator.DoesNotExist:
        return False
