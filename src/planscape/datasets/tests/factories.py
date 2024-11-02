import factory
from django.contrib.gis.geos import Polygon
from datasets.models import (
    Dataset,
    DataLayer,
    Category,
    DataLayerStatus,
    DataLayerType,
    VisibilityOptions,
    GeometryType,
)
from organizations.tests.factories import OrganizationFactory


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


class DataLayerFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = DataLayer

    dataset = factory.SubFactory(DatasetFactory)
    organization = factory.SelfAttribute("dataset.organization")
    created_by = factory.SelfAttribute("dataset.created_by")
    name = factory.Sequence(lambda x: f"DataLayer {x}")
    type = factory.Iterator(DataLayerType.values)
    geometry_type = factory.Iterator(GeometryType.values)
    status = factory.Iterator(DataLayerStatus.values)
    metadata = {}
    url = None
