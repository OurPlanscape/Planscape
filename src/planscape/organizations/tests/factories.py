import factory
from organizations.models import Organization, OrganizationType
from planscape.tests.factories import UserFactory


class OrganizationFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Organization

    created_by = factory.SubFactory(UserFactory)
    name = factory.Sequence(lambda n: f"Organization {n}")
    type = factory.Iterator(OrganizationType.values)