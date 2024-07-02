import factory
from django.contrib.gis.geos import Polygon, MultiPolygon
from impacts.models import TreatmentPlan, TreatmentPrescription
from planscape.tests.factories import UserFactory
from planning.tests.factories import ScenarioFactory, ProjectAreaFactory


class TreatmentPlanFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = TreatmentPlan

    name = factory.Sequence(lambda n: "treatment plan %s" % n)
    scenario = factory.SubFactory(ScenarioFactory)
    created_by = factory.SubFactory(UserFactory)


class TreatmentPrescriptionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = TreatmentPrescription

    uuid = factory.Faker("uuid4")
    treatment_plan = factory.SubFactory(TreatmentPlanFactory)
    created_by = factory.SubFactory(UserFactory)
    project_area = factory.SubFactory(ProjectAreaFactory)
    geometry = Polygon(((1, 1), (1, 2), (2, 2), (1, 1)))
    updated_by = factory.SubFactory(UserFactory)  # this needs to be not-null?
