from typing import Any, Union

from climate_foresight.models import ClimateForesightRun
from django.contrib.auth.models import AbstractUser
from django.contrib.contenttypes.models import ContentType
from planning.models import PlanningArea, PlanningAreaNote, Scenario

from collaboration.models import Permissions, Role, UserObjectRole

TCreatable = Union[PlanningArea, PlanningAreaNote, Scenario, ClimateForesightRun]


def is_creator(user: AbstractUser, instance: TCreatable) -> bool:
    if hasattr(instance, "user"):
        return instance.user == user

    return instance.created_by == user


def check_for_owner_permission(user_id: int, model: Any, permission_name: str) -> bool:
    if user_id is None:
        return False
    try:
        content_type = ContentType.objects.get_for_model(model)
        entry = UserObjectRole.objects.get(
            collaborator_id=user_id,
            content_type_id=content_type.pk,
            object_pk=model.pk,
            role=Role.OWNER,
        )
        Permissions.objects.get(role=entry.role, permission=permission_name)
        return True
    except (UserObjectRole.DoesNotExist, Permissions.DoesNotExist):
        return False


def check_for_permission(user_id: int, model: Any, permission_name: str) -> bool:
    if user_id is None:
        return False
    try:
        content_type = ContentType.objects.get_for_model(model)
        entry = UserObjectRole.objects.get(
            collaborator_id=user_id,
            content_type_id=content_type.pk,
            object_pk=model.pk,
        )
        Permissions.objects.get(role=entry.role, permission=permission_name)
        return True
    except (UserObjectRole.DoesNotExist, Permissions.DoesNotExist):
        return False
