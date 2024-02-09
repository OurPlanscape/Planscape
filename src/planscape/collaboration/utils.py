from collaboration.models import Collaborator, Permissions, Role
from planning.models import PlanningArea, Scenario
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.db import IntegrityError

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
    if is_creator(user, planning_area) or scenario.user.pk == user.pk:
        return True
    try:
        entry = get_collaborator(user.id, planning_area.id)
        return is_owner(entry)
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


def get_permissions(email, planning_area: PlanningArea, content_type_id):
    collaboration = Collaborator.objects.get(
        email=email,
        object_pk=planning_area.pk,
        content_type_id=content_type_id,
    )
    print(
        f"Here is the collab record {collaboration.email} {collaboration.object_pk} {collaboration.role}"
    )
    # Get the role from the collaboration.
    permissions = Permissions.objects.filter(role=collaboration.role)
    return permissions


def add_collaborator(email, role, object_id, content_type_id, inviter_id):
    # TODO: make sure the role is actually a valid role
    _, did_add = Collaborator.objects.update_or_create(
        defaults={
            "role": role,
            "inviter_id": inviter_id,
        },
        email=email,
        object_pk=object_id,
        content_type_id=content_type_id,
    )
