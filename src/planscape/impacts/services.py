from typing import List, Type, Dict, Union, Tuple
from django.db import transaction
from impacts.models import (
    TreatmentPlan,
    TreatmentPlanStatus,
    TreatmentPrescription,
    TreatmentPrescriptionType,
    get_prescription_type,
)
from planning.models import ProjectArea, Scenario
from django.contrib.auth.models import AbstractUser
from actstream import action as actstream_action

from stands.models import Stand

TreatmentPlanType = Type[TreatmentPlan]
ScenarioType = Type[Scenario]
UserType = Type[AbstractUser]
StandType = Type[Stand]
ActionType = Type[TreatmentPrescriptionType]
ProjectAreaType = Type[ProjectArea]
TreatmentPrescriptionEntityType = Type[TreatmentPrescription]
CloneResultType = Tuple[TreatmentPlanType, List[TreatmentPrescriptionEntityType]]


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
    actstream_action.send(created_by, verb="created", action_object=treatment_plan)
    return treatment_plan


@transaction.atomic()
def upsert_treatment_prescriptions(
    treatment_plan: TreatmentPlanType,
    project_area: ProjectAreaType,
    stands: List[StandType],
    action_type: ActionType,
    created_by: UserType,
) -> List[TreatmentPrescriptionEntityType]:
    def upsert(treatment_plan, project_area, stand, action_type, user):
        upsert_defaults = {
            "type": get_prescription_type(action_type),
            "created_by": user,
            "updated_by": user,
            "geometry": stand.geometry,
            "action": action_type,
        }
        instance, created = TreatmentPrescription.objects.update_or_create(
            treatment_plan=treatment_plan,
            project_area=project_area,
            stand=stand,
            defaults=upsert_defaults,
        )
        verb = "created" if created else "updated"
        actstream_action.send(user, verb=verb, action_object=instance)
        return instance

    results = list(
        map(
            lambda stand: upsert(
                treatment_plan=treatment_plan,
                project_area=project_area,
                action_type=action_type,
                user=created_by,
                stand=stand,
            ),
            stands,
        )
    )
    return results


@transaction.atomic()
def clone_treatment_prescription(
    rx_prescription: TreatmentPrescriptionEntityType,
    new_treatment_plan: TreatmentPlanType,
    user: UserType,
):
    return TreatmentPrescription.objects.create(
        created_by=user,
        updated_by=user,
        treatment_plan=new_treatment_plan,
        project_area=rx_prescription.project_area,
        type=rx_prescription.type,
        action=rx_prescription.action,
        stand=rx_prescription.stand,
        geometry=rx_prescription.geometry,
    )


@transaction.atomic()
def clone_treatment_plan(
    treatment_plan: TreatmentPlanType,
    user: UserType,
) -> CloneResultType:
    cloned_plan = TreatmentPlan.objects.create(
        created_by=user,
        scenario=treatment_plan.scenario,
        status=TreatmentPlanStatus.PENDING,
        name=treatment_plan.name,  # TODO fix name
    )

    cloned_prescriptions = list(
        map(
            lambda rx: clone_treatment_prescription(rx, cloned_plan, user),
            treatment_plan.tx_prescriptions.all(),
        )
    )

    actstream_action.send(
        user,
        verb="cloned",
        action_object=cloned_plan,
        target=treatment_plan,
    )

    return (cloned_plan, cloned_prescriptions)
