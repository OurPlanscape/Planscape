import factory
import factory.fuzzy
from climate_foresight.models import ClimateForesightRun
from planning.tests.factories import PlanningAreaFactory
from planscape.tests.factories import UserFactory


class ClimateForesightRunFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ClimateForesightRun

    planning_area = factory.SubFactory(PlanningAreaFactory)
    name = factory.Sequence(lambda n: "Climate Analysis Run %s" % n)
    user = factory.SubFactory(UserFactory)
    status = factory.fuzzy.FuzzyChoice(["draft", "running", "done"])
