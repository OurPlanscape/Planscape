from typing import Type
from django.db import transaction
from impacts.models import TreatmentPlan, TreatmentPlanStatus
from planning.models import Scenario
from django.contrib.auth.models import AbstractUser
from actstream import action

TreatmentPlanType = Type[TreatmentPlan]
ScenarioType = Type[Scenario]
UserType = Type[AbstractUser]


@transaction.atomic()
def create_treatment_plan(
    scenario: ScenarioType,
    name: str,
    user: UserType,
) -> TreatmentPlanType:
    # question: should we add a constraint on
    # treament plan to prevent users from creating
    # treamentplans with for the same scenario with the
    # same name?
    treatment_plan = TreatmentPlan.objects.create(
        created_by=user,
        scenario=scenario,
        status=TreatmentPlanStatus.PENDING,
        name=name,
    )
    action.send(user, verb="created", action_object=treatment_plan)
    return treatment_plan
