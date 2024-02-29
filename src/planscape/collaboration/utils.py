from collaboration.models import UserObjectRole, Permissions
from planning.models import PlanningArea
from django.contrib.contenttypes.models import ContentType
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
