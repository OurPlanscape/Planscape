from typing import List, Type
from django.db import transaction
from impacts.models import (
    TreatmentPlan,
    TreatmentPlanStatus,
    TreatmentPrescription,
    TreatmentPrescriptionType,
)
from planning.models import ProjectArea, Scenario
from django.contrib.auth.models import AbstractUser
from actstream import action

from stands.models import Stand

TreatmentPlanType = Type[TreatmentPlan]
ScenarioType = Type[Scenario]
UserType = Type[AbstractUser]
StandType = Type[Stand]
ActionType = Type[TreatmentPrescriptionType]
ProjectAreaType = Type[ProjectArea]
TreatmentPrescriptionEntityType = Type[TreatmentPrescription]


@transaction.atomic()
def create_treatment_plan(
    scenario: ScenarioType,
    name: str,
    created_by: UserType,
) -> TreatmentPlanType:
    # question: should we add a constraint on
    # treament plan to prevent users from creating
    # treamentplans with for the same scenario with the
    # same name?
    treatment_plan = TreatmentPlan.objects.create(
        created_by=created_by,
        scenario=scenario,
        status=TreatmentPlanStatus.PENDING,
        name=name,
    )
    action.send(created_by, verb="created", action_object=treatment_plan)
    return treatment_plan


@transaction.atomic()
def upsert_treatment_prescriptions(
    treatment_plan: TreatmentPlanType,
    project_area: ProjectAreaType,
    action: ActionType,
    stands: List[StandType],
) -> List[TreatmentPrescriptionEntityType]:
    pass
