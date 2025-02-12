import factory
import factory.fuzzy
from django.contrib.gis.geos import Polygon
from impacts.models import (
    TreatmentPlan,
    TreatmentPrescription,
    TreatmentPrescriptionAction,
    TreatmentResult,
    TreatmentResultType,
    ImpactVariable,
    ImpactVariableAggregation,
    ProjectAreaTreatmentResult,
    get_prescription_type,
)
from planning.tests.factories import ScenarioFactory, ProjectAreaFactory
from stands.models import StandSizeChoices
from stands.tests.factories import StandFactory


class TreatmentPlanFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = TreatmentPlan

    name = factory.Sequence(lambda n: "treatment plan %s" % n)
    scenario = factory.SubFactory(ScenarioFactory)
    created_by = factory.SelfAttribute("scenario.user")


class TreatmentPrescriptionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = TreatmentPrescription

    uuid = factory.Faker("uuid4")
    treatment_plan = factory.SubFactory(TreatmentPlanFactory)
    project_area = factory.SubFactory(ProjectAreaFactory)
    stand = factory.SubFactory(StandFactory, size=StandSizeChoices.LARGE)
    action = factory.Iterator([i for i in TreatmentPrescriptionAction])
    type = factory.LazyAttribute(lambda obj: get_prescription_type(obj.action))
    created_by = factory.SelfAttribute("treatment_plan.created_by")
    updated_by = factory.SelfAttribute("treatment_plan.created_by")
    geometry = Polygon(((1, 1), (1, 2), (2, 2), (1, 1)))


class TreatmentResultFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = TreatmentResult

    treatment_plan = factory.SubFactory(TreatmentPlanFactory)
    stand = factory.SubFactory(StandFactory)
    variable = factory.fuzzy.FuzzyChoice([v for v in ImpactVariable])
    aggregation = ImpactVariableAggregation.MEAN
    year = factory.fuzzy.FuzzyInteger(low=0, high=20)
    value = factory.fuzzy.FuzzyFloat(low=0, high=100)
    baseline = factory.fuzzy.FuzzyFloat(low=0, high=100)
    type = TreatmentResultType.DIRECT
    action = factory.fuzzy.FuzzyChoice([a for a in TreatmentPrescriptionAction])


class ProjectAreaTreatmentResultFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = ProjectAreaTreatmentResult

    treatment_plan = factory.SubFactory(TreatmentPlanFactory)
    project_area = factory.SubFactory(ProjectAreaFactory)
    variable = factory.fuzzy.FuzzyChoice(ImpactVariable.values)
    aggregation = factory.fuzzy.FuzzyChoice(ImpactVariableAggregation.values)
    year = factory.fuzzy.FuzzyInteger(low=0, high=20)
    value = factory.fuzzy.FuzzyFloat(low=0, high=100)
    baseline = factory.fuzzy.FuzzyFloat(low=0, high=100)
    delta = factory.fuzzy.FuzzyFloat(low=0, high=100)
    type = TreatmentResultType.DIRECT
    action = factory.fuzzy.FuzzyChoice(TreatmentPrescriptionAction.choices)
    stand_count = factory.fuzzy.FuzzyInteger(low=1, high=20)
