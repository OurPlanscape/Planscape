from collections import defaultdict
from itertools import groupby
from typing import List, Optional, Type, Dict, Union, Tuple, Any
from django.db import transaction
from django.db.models import Count
from django.contrib.postgres.aggregates import ArrayAgg
from impacts.models import (
    TreatmentPlan,
    TreatmentPlanStatus,
    TreatmentPrescription,
    TreatmentPrescriptionType,
    get_prescription_type,
    TxPlanSummary,
    ProjectAreaSummary,
    TxPrescriptionSummaryItem,
)
from planning.models import ProjectArea, Scenario
from actstream import action as actstream_action
from stands.models import STAND_AREA_ACRES, Stand, StandSizeChoices
from planscape.typing import UserType

TreatmentPlanType = Type[TreatmentPlan]
ScenarioType = Type[Scenario]
StandType = Type[Stand]
ActionType = Type[TreatmentPrescriptionType]
ProjectAreaType = Type[ProjectArea]
TreatmentPrescriptionEntityType = Type[TreatmentPrescription]
TreatmentPlanCloneResultType = Tuple[
    TreatmentPlanType, List[TreatmentPrescriptionEntityType]
]


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
    action: ActionType,
    created_by: UserType,
) -> List[TreatmentPrescriptionEntityType]:
    def upsert(treatment_plan, project_area, stand, action, user):
        upsert_defaults = {
            "type": get_prescription_type(action),
            "created_by": user,
            "updated_by": user,
            "geometry": stand.geometry,
            "action": action,
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
                action=action,
                user=created_by,
                stand=stand,
            ),
            stands,
        )
    )
    return results


@transaction.atomic()
def clone_treatment_prescription(
    tx_prescription: TreatmentPrescriptionEntityType,
    new_treatment_plan: TreatmentPlanType,
    user: UserType,
):
    return TreatmentPrescription.objects.create(
        created_by=user,
        updated_by=user,
        treatment_plan=new_treatment_plan,
        project_area=tx_prescription.project_area,
        type=tx_prescription.type,
        action=tx_prescription.action,
        stand=tx_prescription.stand,
        geometry=tx_prescription.geometry,
    )


def get_cloned_name(name: str) -> str:
    return f"{name} (clone)"


@transaction.atomic()
def clone_treatment_plan(
    treatment_plan: TreatmentPlanType,
    user: UserType,
) -> TreatmentPlanCloneResultType:
    cloned_plan = TreatmentPlan.objects.create(
        created_by=user,
        scenario=treatment_plan.scenario,
        status=TreatmentPlanStatus.PENDING,
        name=get_cloned_name(treatment_plan.name),
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


def generate_summary(
    treatment_plan: TreatmentPlanType,
    project_area: Optional[ProjectArea] = None,
) -> Dict[str, Any]:
    scenario = treatment_plan.scenario
    plan_area = scenario.planning_area
    stand_size = scenario.configuration["stand_size"]
    stand_area = STAND_AREA_ACRES[stand_size]

    pa_filter = {"scenario": scenario}
    tp_filter = {"treatment_plan": treatment_plan}

    if project_area:
        pa_filter = {**pa_filter, "id": project_area.id}
        tp_filter = {**tp_filter, "project_area": project_area}

    prescriptions = (
        TreatmentPrescription.objects.filter(**tp_filter)
        .values(
            "project_area__id",
            "type",
            "action",
        )
        .annotate(stand_ids=ArrayAgg("stand__id"), treated_stand_count=Count("stand"))
        .order_by("project_area__id")
    )
    project_areas = {}
    project_area_queryset = ProjectArea.objects.filter(**pa_filter)
    for project in project_area_queryset:
        stand_project_qs = Stand.objects.filter(
            size=stand_size,
            geometry__intersects=project.geometry,
        )
        project_areas[project.id] = {
            "project_area_id": project.id,
            "project_area_name": project.name,
            "total_stand_count": stand_project_qs.count(),
            "prescriptions": [
                {
                    "action": p["action"],
                    "type": p["type"],
                    "treated_stand_count": p["treated_stand_count"],
                    "area_acres": p["treated_stand_count"] * stand_area,
                    "stand_ids": p["stand_ids"],
                }
                for p in filter(
                    lambda p: p["project_area__id"] == project.id,
                    prescriptions,
                )
            ],
        }

    data = {
        "planning_area_id": plan_area.id,
        "planning_area_name": plan_area.name,
        "scenario_id": scenario.id,
        "scenario_name": scenario.name,
        "treatment_plan_id": treatment_plan.pk,
        "treatment_plan_name": treatment_plan.name,
        "project_areas": list(project_areas.values()),
    }
    return data
