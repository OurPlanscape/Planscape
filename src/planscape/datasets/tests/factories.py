import factory
from datasets.models import (
    Dataset,
    DataLayer,
    Category,
    DataLayerHasStyle,
    DataLayerStatus,
    DataLayerType,
    VisibilityOptions,
    GeometryType,
    Style,
)
from organizations.tests.factories import OrganizationFactory
from planscape.tests.factories import UserFactory


class DatasetFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Dataset

    organization = factory.SubFactory(OrganizationFactory)
    created_by = factory.SelfAttribute("organization.created_by")
    name = factory.Sequence(lambda x: f"Dataset {x}")
    visibility = factory.Iterator(VisibilityOptions.values)


class CategoryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Category

    dataset = factory.SubFactory(DatasetFactory)
    organization = factory.SelfAttribute("dataset.organization")
    created_by = factory.SelfAttribute("dataset.created_by")
    name = factory.Sequence(lambda x: f"Category {x}")


class StyleFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Style

    created_by = factory.SubFactory(UserFactory)
    organization = factory.SubFactory(OrganizationFactory)
    name = factory.Sequence(lambda x: f"Style {x}")
    data = {"foo": "bar"}


class DataLayerFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = DataLayer

    dataset = factory.SubFactory(DatasetFactory)
    organization = factory.SelfAttribute("dataset.organization")
    created_by = factory.SelfAttribute("dataset.created_by")
    name = factory.Faker("name")
    type = factory.Iterator(DataLayerType.values)
    geometry_type = factory.Iterator(GeometryType.values)
    status = DataLayerStatus.READY
    metadata = {}
    url = None

    @factory.post_generation
    def style(self, create, extracted, **kwargs):
        if not create or not extracted:
            return
        DataLayerHasStyleFactory.create(datalayer=self, style=extracted)
        return extracted


class DataLayerHasStyleFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = DataLayerHasStyle

    datalayer = factory.SubFactory(DataLayerFactory)
    style = factory.SubFactory(StyleFactory)
