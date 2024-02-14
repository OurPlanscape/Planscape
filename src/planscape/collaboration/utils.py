from collaboration.models import Collaborator, Permissions, Role
from planning.models import PlanningArea, Scenario
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType


User = get_user_model()


def is_creator(user: User, planning_area: PlanningArea):
    return planning_area.user.pk == user.pk


def has_access(user_id, model, permission):
    try:
        content_type = ContentType.objects.get_for_model(model)
        entry = Collaborator.objects.get(
            collaborator_id=user_id,
            content_type_id=content_type,
            object_pk=model.pk,
        )
        Permissions.objects.get(role=entry.role, permission=permission)
        return True
    except (Collaborator.DoesNotExist, Permissions.DoesNotExist):
        return False


def create_collaborator_record(user, invitee, model, role: Role):
    content_type = ContentType.objects.get_for_model(model)
    collaborator = Collaborator.objects.create(
        email="john@doe.com",
        collaborator=invitee,
        role=role,
        inviter=user,
        content_type=content_type,
        object_pk=model.pk,
    )
    collaborator.save()


def can_view_planning_area(user: User, planning_area: PlanningArea):
    if is_creator(user, planning_area):
        return True
    try:
        return has_access(user.id, planning_area, "view_planningarea")
    except (Collaborator.DoesNotExist, Permissions.DoesNotExist):
        return False


def can_view_scenario(user: User, planning_area: PlanningArea):
    if is_creator(user, planning_area):
        return True
    try:
        return has_access(user.id, planning_area, "view_scenario")
    except (Collaborator.DoesNotExist, Permissions.DoesNotExist):
        return False


def can_add_scenario(user: User, planning_area: PlanningArea):
    if is_creator(user, planning_area):
        return True
    try:
        return has_access(user.id, planning_area, "add_scenario")
    except (Collaborator.DoesNotExist, Permissions.DoesNotExist):
        return False


def can_archive_scenario(user: User, planning_area: PlanningArea, scenario: Scenario):
    if is_creator(user, planning_area) or scenario.user.pk == user.pk:
        return True
    try:
        return has_access(user.id, planning_area, "change_scenario")
    except (Collaborator.DoesNotExist, Permissions.DoesNotExist):
        return False


def can_view_collaborators(user: User, planning_area: PlanningArea):
    if is_creator(user, planning_area):
        return True
    try:
        return has_access(user.id, planning_area, "view_collaborator")
    except (Collaborator.DoesNotExist, Permissions.DoesNotExist):
        return False


def can_add_collaborators(user: User, planning_area: PlanningArea):
    if is_creator(user, planning_area):
        return True
    try:
        return has_access(user.id, planning_area, "add_collaborator")
    except (Collaborator.DoesNotExist, Permissions.DoesNotExist):
        return False


def can_change_collaborators(user: User, planning_area: PlanningArea):
    if is_creator(user, planning_area):
        return True
    try:
        return has_access(user.id, planning_area, "change_collaborator")
    except (Collaborator.DoesNotExist, Permissions.DoesNotExist):
        return False


def can_delete_collaborators(user: User, planning_area: PlanningArea):
    if is_creator(user, planning_area):
        return True
    try:
        return has_access(user.id, planning_area, "delete_collaborator")
    except (Collaborator.DoesNotExist, Permissions.DoesNotExist):
        return False
