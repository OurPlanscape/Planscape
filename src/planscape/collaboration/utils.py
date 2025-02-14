from typing import Any, Union
from collaboration.models import UserObjectRole, Permissions
from planning.models import PlanningArea, PlanningAreaNote, Scenario
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth.models import AbstractUser

TCreatable = Union[PlanningArea, PlanningAreaNote, Scenario]


def is_creator(user: AbstractUser, instance: TCreatable) -> bool:
    return instance.user == user


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
