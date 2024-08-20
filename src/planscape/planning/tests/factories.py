import factory
from django.contrib.gis.geos import Polygon, MultiPolygon
from planning.models import (
    PlanningArea,
    ProjectArea,
    ProjectAreaOrigin,
    Scenario,
    ScenarioOrigin,
    ScenarioResult,
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

    origin = factory.Iterator([ScenarioOrigin.SYSTEM, ScenarioOrigin.USER])

    uuid = factory.Faker("uuid4")

    status = ScenarioStatus.ACTIVE

    configuration = factory.LazyAttribute(lambda x: dict())

    result_status = ScenarioResultStatus.PENDING


class ScenarioResultFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ScenarioResult

    scenario = factory.SubFactory(ScenarioFactory)


class ProjectAreaFactory(factory.django.DjangoModelFactory):
    created_by = factory.SelfAttribute("scenario.user")

    scenario = factory.SubFactory(ScenarioFactory)

    name = factory.Sequence(lambda x: "project area %s" % x)

    geometry = MultiPolygon(Polygon(((1, 1), (1, 2), (2, 2), (1, 1))))

    class Meta:
        model = ProjectArea
