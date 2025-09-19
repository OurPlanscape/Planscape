import factory
import factory.fuzzy
from climate_foresight.models import ClimateForesight
from planning.tests.factories import PlanningAreaFactory
from planscape.tests.factories import UserFactory


class ClimateForesightFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ClimateForesight

    planning_area = factory.SubFactory(PlanningAreaFactory)
    name = factory.Sequence(lambda n: "Climate Analysis %s" % n)
    user = factory.SubFactory(UserFactory)
    status = factory.fuzzy.FuzzyChoice(["draft", "running", "done"])
