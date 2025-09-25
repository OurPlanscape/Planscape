import factory
import factory.fuzzy
from datasets.tests.factories import DataLayerFactory
from django.contrib.gis.geos import Polygon
from django.contrib.gis.db.models.functions import Centroid, GeoHash, Transform
from django.db.models import F

from stands.models import Stand, StandMetric, StandSizeChoices


GEOHASH_PRECISION = 11
TARGET_SRID = 4326


class StandFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Stand

    size = factory.Iterator(
        [StandSizeChoices.LARGE, StandSizeChoices.MEDIUM, StandSizeChoices.SMALL]
    )
    geometry = Polygon(((1, 1), (1, 2), (2, 2), (1, 1)))
    area_m2 = factory.SelfAttribute("geometry.area")

    @factory.post_generation
    def with_calculated_grid_key(self, create, extracted, **kwargs):
        if not create or not extracted:
            return
        geohash_expr = GeoHash(
            Centroid(Transform(self.geometry, TARGET_SRID)),
            precision=GEOHASH_PRECISION,
        )
        self.grid_key = geohash_expr.resolve_expression(self)


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
