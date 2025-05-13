import factory
import factory.fuzzy
from collaboration.models import Role
from collaboration.tests.factories import UserObjectRoleFactory
from django.contrib.gis.geos import MultiPolygon, Polygon
from planning.models import (
    PlanningArea,
    ProjectArea,
    Scenario,
    ScenarioOrigin,
    ScenarioResult,
    ScenarioResultStatus,
    ScenarioStatus,
    TreatmentGoal,
    TreatmentGoalCategory,
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

    @factory.post_generation
    def owners(self, create, extracted, **kwargs):
        if not create or not extracted:
            return

        for owner_user in extracted:
            UserObjectRoleFactory(
                inviter=self.user,
                collaborator=owner_user,
                email=owner_user.email,
                role=Role.OWNER,
                associated_model=self,
            )

    @factory.post_generation
    def collaborators(self, create, extracted, **kwargs):
        if not create or not extracted:
            return

        for collab_user in extracted:
            UserObjectRoleFactory(
                inviter=self.user,
                collaborator=collab_user,
                email=collab_user.email,
                role=Role.COLLABORATOR,
                associated_model=self,
            )

    @factory.post_generation
    def viewers(self, create, extracted, **kwargs):
        if not create or not extracted:
            return

        for viewer_user in extracted:
            UserObjectRoleFactory(
                inviter=self.user,
                collaborator=viewer_user,
                email=viewer_user.email,
                role=Role.VIEWER,
                associated_model=self,
            )


class TreatmentGoalFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = TreatmentGoal

    name = factory.Sequence(lambda x: "treatment goal %s" % x)
    description = factory.Faker("text")
    active = True
    priorities = ["foo", "bar", "baz"]
    category = factory.fuzzy.FuzzyChoice(TreatmentGoalCategory.values)
    created_by = factory.SubFactory(UserFactory)


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

    treatment_goal = factory.SubFactory(TreatmentGoalFactory)

    @factory.post_generation
    def with_scenario_result(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted == True:
            ScenarioResultFactory(scenario=self)


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
        model = ProjectArea
