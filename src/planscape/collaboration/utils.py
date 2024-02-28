from collaboration.models import UserObjectRole, Permissions, Role
from planning.models import PlanningArea
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.contrib.auth.models import User


def is_creator(user: User, planning_area: PlanningArea):
    return planning_area.user.pk == user.pk


def check_for_permission(user_id, model, permission):
    try:
        content_type = ContentType.objects.get_for_model(model)
        entry = UserObjectRole.objects.get(
            collaborator_id=user_id,
            content_type_id=content_type,
            object_pk=model.pk,
        )
        Permissions.objects.get(role=entry.role, permission=permission)
        return True
    except (UserObjectRole.DoesNotExist, Permissions.DoesNotExist):
        return False


def create_collaborator_record(
    user: User, invitee: User, model: models.Model, role: Role
):
    content_type = ContentType.objects.get_for_model(model)
    collaborator = UserObjectRole.objects.create(
        email=invitee.email,
        collaborator=invitee,
        role=role,
        inviter=user,
        content_type=content_type,
        object_pk=model.pk,
    )
    collaborator.save()
