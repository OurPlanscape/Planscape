import factory

from django.contrib.contenttypes.models import ContentType
from django.db import models

from collaboration.models import UserObjectRole, Role, Permissions
from planscape.tests.factories import UserFactory


class UserObjectRoleFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = UserObjectRole

    email = factory.Faker("ascii_email")
    collaborator = factory.SubFactory(UserFactory)
    role = Role.VIEWER
    inviter = factory.SubFactory(UserFactory)

    @classmethod
    def _create(cls, model_class, associated_model: models.Model, *args, **kwargs):
        content_type = ContentType.objects.get_for_model(associated_model)

        manager = cls._get_manager(model_class)
        return manager.create(
            content_type=content_type, object_pk=associated_model.pk, *args, **kwargs
        )
