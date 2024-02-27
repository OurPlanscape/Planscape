from collaboration.exceptions import InvalidOwnership
from collaboration.models import Permissions, Role, UserObjectRole
from django.db import transaction
from django.db.models import Model, Q
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth import get_user_model
from collaboration.tasks import send_invitation
from planning.models import PlanningArea
import logging

logger = logging.getLogger(__name__)


User = get_user_model()


def get_content_type(target_entity: str) -> Model:
    return ContentType.objects.get(model=target_entity)


def validate_ownership(user, instance):
    match instance:
        case PlanningArea():
            return instance.user.pk == user.pk
        case _:
            return False


def get_permissions(user, instance):
    is_owner = validate_ownership(user, instance)
    if is_owner:
        qs = Permissions.objects.filter(role=Role.OWNER)
    else:
        content_type = ContentType.objects.get_for_model(instance)
        user_object_role = UserObjectRole.objects.filter(
            collaborator=user, content_type=content_type, object_pk=instance.pk
        ).first()
        if not user_object_role:
            qs = Permissions.objects.none()
        else:
            qs = Permissions.objects.filter(role=user_object_role.role)

    return qs.values_list("permission", flat=True)


@transaction.atomic()
def create_invite(
    inviter,
    email: str,
    role: Role,
    target_entity: str,
    object_pk: int,
    message: str,
):
    content_type = get_content_type(target_entity)
    Model = content_type.model_class()
    instance = Model.objects.filter(pk=object_pk).first()
    if not validate_ownership(user=inviter, instance=instance):
        raise InvalidOwnership(
            f"inviter {inviter.email} does not have ownership of {target_entity} object {object_pk}"
        )

    collaborator = User.objects.filter(email=email).first()
    collaborator_exists = collaborator is not None
    object_role, created = UserObjectRole.objects.update_or_create(
        email=email,
        content_type=content_type,
        object_pk=object_pk,
        defaults={
            "role": role,
            "inviter": inviter,
            "collaborator": collaborator,
        },
    )

    send_invitation.delay(object_role.pk, collaborator_exists, message)

    logger.info(
        "%s just invited %s with role %s to work on %s - %s",
        inviter.email,
        email,
        role,
        target_entity,
        object_pk,
    )

    return object_role


def get_planningareas_for_user(user):
    content_type = get_content_type("planningarea")
    areas = PlanningArea.objects.filter(
        Q(user=user)
        | Q(
            pk__in=UserObjectRole.objects.filter(
                collaborator_id=user, content_type_id=content_type.pk
            ).values_list("object_pk", flat=True)
        )
    )
    return areas
