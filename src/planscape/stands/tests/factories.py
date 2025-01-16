import factory
import factory.fuzzy
from django.contrib.gis.geos import Polygon
from impacts.models import ImpactVariable
from stands.models import Stand, StandMetric, StandSizeChoices
from datasets.tests.factories import DataLayerFactory


class StandFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Stand

    size = factory.Iterator(
        [StandSizeChoices.LARGE, StandSizeChoices.MEDIUM, StandSizeChoices.SMALL]
    )
    geometry = Polygon(((1, 1), (1, 2), (2, 2), (1, 1)))
    area_m2 = factory.SelfAttribute("geometry.area")


class StandMetricFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = StandMetric

    stand = factory.SubFactory(StandFactory)
    datalayer = factory.SubFactory(DataLayerFactory)
    avg = factory.fuzzy.FuzzyFloat(low=0, high=100)
    min = factory.fuzzy.FuzzyFloat(low=0, high=50)
    max = factory.fuzzy.FuzzyFloat(low=50, high=100)
    sum = factory.fuzzy.FuzzyFloat(low=0, high=500)
    count = factory.fuzzy.FuzzyInteger(low=1, high=100)
    majority = factory.fuzzy.FuzzyFloat(low=0, high=100)
    minority = factory.fuzzy.FuzzyFloat(low=0, high=100)
