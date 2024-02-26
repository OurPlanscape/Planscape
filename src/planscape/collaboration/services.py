from collaboration.models import Role, UserObjectRole
from django.db import transaction
from django.db.models import Model, Q
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth import get_user_model
from collaboration.tasks import send_invitation
from planning.models import PlanningArea
import logging

logger = logging.getLogger(__name__)


User = get_user_model()


def get_model_from_entity(target_entity: str) -> Model:
    return ContentType.objects.get(model=target_entity)


def validate_ownership(user, instance):
    match instance:
        case PlanningArea():
            return instance.user.pk == user.pk
        case _:
            return False




@transaction.atomic()
def create_invite(
    inviter,
    email: str,
    role: Role,
    target_entity: str,
    object_pk: int,
    message: str,
):
    entity_type = get_model_from_entity(target_entity)
    collaborator = User.objects.filter(email=email).first()
    collaborator_exists = collaborator is not None
    object_role, created = UserObjectRole.objects.update_or_create(
        email=email,
        content_type=entity_type,
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
    entity_type = get_model_from_entity("planningarea")
    areas = PlanningArea.objects.filter(
        Q(user=user) |
        Q(pk__in=UserObjectRole.objects.filter(collaborator_id=user, content_type_id=entity_type.pk).values_list('object_pk', flat=True))
    )
    return areas