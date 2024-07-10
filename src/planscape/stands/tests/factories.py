import factory
from django.contrib.gis.geos import Polygon
from stands.models import Stand, StandSizeChoices


class StandFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Stand

    size = factory.Iterator(
        [StandSizeChoices.LARGE, StandSizeChoices.MEDIUM, StandSizeChoices.SMALL]
    )
    geometry = Polygon(((1, 1), (1, 2), (2, 2), (1, 1)))
    area_m2 = factory.SelfAttribute("geometry.area")
