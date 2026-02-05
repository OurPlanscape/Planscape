import factory
import factory.fuzzy
from collaboration.models import Role
from collaboration.tests.factories import UserObjectRoleFactory
from datasets.tests.factories import DataLayerFactory
from django.conf import settings
from django.contrib.gis.geos import MultiPolygon, Polygon
from django.db import connection

from planning.models import (
    PlanningArea,
    ProjectArea,
    Scenario,
    ScenarioOrigin,
    ScenarioType,
    ScenarioResult,
    ScenarioResultStatus,
    ScenarioStatus,
    TreatmentGoal,
    TreatmentGoalCategory,
    TreatmentGoalGroup,
    TreatmentGoalUsageType,
    TreatmentGoalUsesDataLayer,
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

    scenario_count = 0

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

    @factory.post_generation
    def with_stands(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            with connection.cursor() as cur:
                cur.execute(
                    """
                    SELECT public.generate_stands_for_planning_area(
                        ST_GeomFromText(%s, %s),
                        %s,
                        %s, %s
                    );
                    """,
                    [
                        self.geometry.wkt,
                        self.geometry.srid or 4269,
                        "LARGE",
                        settings.HEX_GRID_ORIGIN_X,
                        settings.HEX_GRID_ORIGIN_Y,
                    ],
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
    group = factory.fuzzy.FuzzyChoice(TreatmentGoalGroup.values)

    @factory.post_generation
    def with_datalayers(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            TreatmentGoalUsesDataLayerFactory.create(
                treatment_goal=self, usage_type=TreatmentGoalUsageType.PRIORITY
            )
            TreatmentGoalUsesDataLayerFactory.create(
                treatment_goal=self,
                usage_type=TreatmentGoalUsageType.THRESHOLD,
                threshold="value < 1",
            )
            TreatmentGoalUsesDataLayerFactory.create(
                treatment_goal=self,
                usage_type=TreatmentGoalUsageType.SECONDARY_METRIC,
                threshold="value == 1",
            )

    @factory.post_generation
    def datalayers(self, create, extracted, **kwargs):
        if not create or not extracted:
            return

        for datalayer in extracted:
            TreatmentGoalUsesDataLayerFactory(
                treatment_goal=self,
                datalayer=datalayer,
                usage_type=TreatmentGoalUsageType.PRIORITY,
            )


class TreatmentGoalUsesDataLayerFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = TreatmentGoalUsesDataLayer

    treatment_goal = factory.SubFactory(TreatmentGoalFactory)
    datalayer = factory.SubFactory(DataLayerFactory)
    usage_type = TreatmentGoalUsageType.PRIORITY
    threshold = None


class ScenarioFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Scenario

    planning_area = factory.SubFactory(PlanningAreaFactory)

    user = factory.SelfAttribute("planning_area.user")

    name = factory.Sequence(lambda x: "scenario %s" % x)

    origin = factory.Iterator([ScenarioOrigin.SYSTEM, ScenarioOrigin.USER])

    uuid = factory.Faker("uuid4")

    status = ScenarioStatus.ACTIVE

    type = ScenarioType.PRESET

    configuration = factory.LazyAttribute(lambda x: dict())

    result_status = ScenarioResultStatus.PENDING

    treatment_goal = factory.SubFactory(TreatmentGoalFactory)

    @factory.post_generation
    def with_scenario_result(self, create, extracted, **kwargs):
        if not create:
            return

        if extracted:
            ScenarioResultFactory(scenario=self)

    @factory.post_generation
    def with_priority_objectives(self, create, extracted, **kwargs):
        if not create:
            return
        
        if extracted:
            ids = []
            for datalayer in extracted:
                ids.append(datalayer.pk)

            configuration = {"priority_objectives": ids}
            merged_config = {**(self.configuration or {}), **configuration}
            self.configuration = merged_config

    @factory.post_generation
    def with_cobenefits(self, create, extracted, **kwargs):
        if not create:
            return
        
        if extracted:
            ids = []
            for datalayer in extracted:
                ids.append(datalayer.pk)

            configuration = {"cobenefits": ids}
            merged_config = {**(self.configuration or {}), **configuration}
            self.configuration = merged_config


class ScenarioResultFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ScenarioResult

    scenario = factory.SubFactory(ScenarioFactory)

    result = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "crs": {"type": "name", "properties": {"name": "EPSG:4269"}},
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [1, 1],
                            [1, 2],
                            [2, 2],
                            [1, 1],
                        ]
                    ],
                },
                "properties": {
                    "YR": 1,
                    "proj_id": 1,
                    "pct_area": 3.45,
                    "area_acres": 12345.987,
                    "attainment": {
                        "Foo Bar": 5.12345,
                        "Bar Baz": 4.12345,
                        "Baz Foo": 3.12345,
                        "Foo Baz": 2.12345,
                        "Baz Bar": 1.12345,
                    },
                    "total_cost": 12345.987,
                    "stand_count": 123,
                    "pct_excluded": 0,
                    "cost_per_acre": 2470,
                    "text_geometry": "POLYGON((1 1, 1 2, 2 2, 1 1))",
                    "datalayer_1": 12345.987,
                    "datalayer_2": 987.12345,
                    "datalayer_3": 12345.987,
                    "datalayer_4": 987.12345,
                    "datalayer_5": 12345.987,
                    "treatment_rank": 1,
                    "weightedPriority": 12345.987,
                },
            }
        ],
    }


class ProjectAreaFactory(factory.django.DjangoModelFactory):
    created_by = factory.SelfAttribute("scenario.user")

    scenario = factory.SubFactory(ScenarioFactory)

    name = factory.Sequence(lambda x: "project area %s" % x)

    geometry = MultiPolygon(Polygon(((1, 1), (1, 2), (2, 2), (1, 1))))

    class Meta:
        model = ProjectArea
