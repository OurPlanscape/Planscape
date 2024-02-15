from django.contrib.contenttypes.models import ContentType
from collaboration.models import Collaborator, Permissions


def check_for_permission(user_id, model, permission):
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
