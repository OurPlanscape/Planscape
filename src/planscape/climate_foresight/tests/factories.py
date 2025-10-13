import factory
import factory.fuzzy
from climate_foresight.models import (
    ClimateForesightRun,
    ClimateForesightRunInputDataLayer,
)
from datasets.tests.factories import DataLayerFactory
from planning.tests.factories import PlanningAreaFactory
from planscape.tests.factories import UserFactory


class ClimateForesightRunFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ClimateForesightRun

    planning_area = factory.SubFactory(PlanningAreaFactory)
    name = factory.Sequence(lambda n: "Climate Analysis Run %s" % n)
    created_by = factory.SubFactory(UserFactory)
    status = factory.fuzzy.FuzzyChoice(["draft", "running", "done"])


class ClimateForesightRunInputDataLayerFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ClimateForesightRunInputDataLayer

    run = factory.SubFactory(ClimateForesightRunFactory)
    datalayer = factory.SubFactory(DataLayerFactory)
    favor_high = factory.fuzzy.FuzzyChoice([True, False])
    pillar = factory.fuzzy.FuzzyChoice(
        ["Ecological", "Social", "Economic", "Operational"]
    )
