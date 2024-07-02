import factory
from django.contrib.gis.geos import Polygon, MultiPolygon
from planning.models import (
    PlanningArea,
    ProjectArea,
    Scenario,
    ScenarioResultStatus,
    ScenarioStatus,
)
from planscape.tests.factories import UserFactory


class PlanningAreaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = PlanningArea

    user = factory.SubFactory(UserFactory)
    region_name = factory.Iterator(
        [
            "sierra-nevada",
            "central-coast",
        ],
    )

    name = factory.Sequence(lambda n: "planning area %s" % n)

    geometry = MultiPolygon(Polygon(((1, 1), (1, 2), (2, 2), (1, 1))))


class ScenarioFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Scenario

    planning_area = factory.SubFactory(PlanningAreaFactory)

    user = factory.SelfAttribute("planning_area.user")

    name = factory.Sequence(lambda x: "scenario %s" % x)

    uuid = factory.Faker("uuid4")

    status = ScenarioStatus.ACTIVE
    result_status = ScenarioResultStatus.PENDING


class ProjectAreaFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ProjectArea

    geometry = MultiPolygon(Polygon(((1, 1), (1, 2), (2, 2), (1, 1))))
    created_by = factory.SubFactory(UserFactory)
    scenario = factory.SubFactory(ScenarioFactory)
