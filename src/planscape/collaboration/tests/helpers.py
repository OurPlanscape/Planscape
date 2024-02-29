from collaboration.models import UserObjectRole, Role
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth.models import User


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
