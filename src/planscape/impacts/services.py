import logging
import itertools
import json
from typing import Iterable, List, Optional, Dict, Tuple, Any
from django.db import transaction
from django.db.models import Count, QuerySet, Sum, F, Case, When
from django.contrib.auth.models import AbstractUser
from django.contrib.gis.db.models import Union as UnionOp
from django.contrib.postgres.aggregates import ArrayAgg
from impacts.calculator import calculate_delta
from impacts.models import (
    AVAILABLE_YEARS,
    ImpactVariable,
    ImpactVariableAggregation,
    ProjectAreaTreatmentResult,
    TreatmentPlan,
    TreatmentPlanStatus,
    TreatmentPrescription,
    TreatmentPrescriptionAction,
    TreatmentResult,
    TTreatmentPlanCloneResult,
    TreatmentResultType,
    get_prescription_type,
)
from actstream import action as actstream_action
from planning.models import Scenario, ProjectArea
from stands.models import STAND_AREA_ACRES, StandMetric, Stand
from stands.services import calculate_stand_zonal_stats

log = logging.getLogger(__name__)


@transaction.atomic()
def create_treatment_plan(
    scenario: Scenario,
    name: str,
    created_by: AbstractUser,
) -> TreatmentPlan:
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
    treatment_plan: TreatmentPlan,
    project_area: ProjectArea,
    stands: List[Stand],
    action: TreatmentPrescriptionAction,
    created_by: AbstractUser,
) -> List[TreatmentPrescription]:
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
    tx_prescription: TreatmentPrescription,
    new_treatment_plan: TreatmentPlan,
    user: AbstractUser,
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
    treatment_plan: TreatmentPlan,
    user: AbstractUser,
) -> TTreatmentPlanCloneResult:
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
    treatment_plan: TreatmentPlan,
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
    project_areas = []
    project_area_queryset = ProjectArea.objects.filter(**pa_filter).order_by("name")

    project_areas_geometry = project_area_queryset.all().aggregate(
        geometry=UnionOp("geometry")
    )["geometry"]
    stand_size = treatment_plan.scenario.get_stand_size()
    for project in project_area_queryset:
        stand_project_qs = Stand.objects.within_polygon(
            project.geometry, stand_size
        ).all()
        project_areas.append(
            {
                "project_area_id": project.id,
                "project_area_name": project.name,
                "total_stand_count": stand_project_qs.count(),
                "extent": project.geometry.extent,
                "centroid": json.loads(project.geometry.point_on_surface.json),
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
        )

    data = {
        "planning_area_id": plan_area.id,
        "planning_area_name": plan_area.name,
        "scenario_id": scenario.id,
        "scenario_name": scenario.name,
        "treatment_plan_id": treatment_plan.pk,
        "treatment_plan_name": treatment_plan.name,
        "project_areas": project_areas,
        "extent": project_areas_geometry.extent,
    }
    return data


def generate_impact_results_data_to_plot(
    treatment_plan: TreatmentPlan,
    impact_variables: List,
    project_area_pks: Optional[List] = None,
    tx_px_actions: Optional[List] = None,
) -> List[Dict]:
    filters = {
        "treatment_plan": treatment_plan,
        "variable__in": impact_variables,
        "aggregation": ImpactVariableAggregation.MEAN,
    }

    if project_area_pks:
        filters["project_area_id__in"] = project_area_pks

    if tx_px_actions:
        filters["action__in"] = tx_px_actions

    queryset = ProjectAreaTreatmentResult.objects.filter(**filters)

    years = queryset.values_list("year", flat=True).distinct("year").order_by("year")
    years = [year for year in years]

    aggregated_values = (
        queryset.values("year", "variable")
        .annotate(
            dividend=Sum(F("value") * F("stand_count")), divisor=Sum("stand_count")
        )
        .annotate(
            value=Case(
                When(divisor=0, then=None),
                default=(F("dividend") / F("divisor")),
            )
        )
    )

    impact_variables_indexes = {k: v for v, k in enumerate(impact_variables)}

    values = sorted(
        aggregated_values,
        key=lambda x: int(
            f"{x.get('year')}{impact_variables_indexes[x.get('variable')]}"
        ),
    )

    return values


def to_project_area_result(
    treatment_plan: TreatmentPlan,
    variable: ImpactVariable,
    year: int,
    result: Dict[str, Any],
) -> ProjectAreaTreatmentResult:
    instance, created = ProjectAreaTreatmentResult.objects.update_or_create(
        treatment_plan=treatment_plan,
        project_area_id=result.get("project_area_id"),
        variable=variable,
        year=year,
        aggregation=result.get("aggregation"),
        action=result.get("action"),
        defaults={
            "value": result.get("value"),
            "baseline": result.get("baseline"),
            "delta": result.get("delta"),
            "type": TreatmentResultType.DIRECT,
            "stand_count": result.get("stand_count"),
        },
    )
    return instance


def to_treatment_result(
    treatment_plan: TreatmentPlan,
    variable: ImpactVariable,
    year: int,
    result: Dict[str, Any],
) -> TreatmentResult:
    """Transforms the result/output of rasterstats (a zonal statistic record)
    into a TreamentResult
    """
    instance, created = TreatmentResult.objects.update_or_create(
        treatment_plan_id=treatment_plan.id,
        stand_id=result.get("stand_id"),
        variable=variable,
        aggregation=result.get("aggregation"),
        year=year,
        defaults={
            "value": result.get("value"),
            "baseline": result.get("baseline"),
            "delta": result.get("delta"),
            "action": result.get("action"),
        },
    )
    return instance


def calculate_impacts(
    treatment_plan: TreatmentPlan,
    variable: ImpactVariable,
    action: TreatmentPrescriptionAction,
    year: int,
) -> Tuple[List[TreatmentResult], List[ProjectAreaTreatmentResult]]:
    if year not in AVAILABLE_YEARS:
        raise ValueError(f"Year {year} not supported")

    prescriptions = treatment_plan.tx_prescriptions.filter(
        action=action
    ).select_related(
        "stand",
        "treatment_plan",
        "project_area",
    )

    stand_ids = prescriptions.values_list("stand_id", flat=True)
    stands = Stand.objects.filter(id__in=stand_ids).with_webmercator()

    baseline_metrics = calculate_metrics(
        stands=stands,
        variable=variable,
        year=year,
    )

    action_metrics = calculate_metrics(
        stands=stands,
        variable=variable,
        year=year,
        action=action,
    )

    baseline_dict = {m.stand_id: m for m in baseline_metrics}
    action_dict = {m.stand_id: m for m in action_metrics}

    deltas = calculate_stand_deltas(
        baseline_dict=baseline_dict,
        action_dict=action_dict,
        action=action,
    )

    project_area_deltas = []
    for project_area in treatment_plan.scenario.project_areas.all():
        project_area_deltas.extend(
            calculate_project_area_deltas(
                project_area=project_area,
                baseline_dict=baseline_dict,
                action_dict=action_dict,
                action=action,
            )
        )

    project_area_results = list(
        map(
            lambda x: to_project_area_result(
                treatment_plan,
                variable,
                year,
                result=x,
            ),
            project_area_deltas,
        )
    )
    treatment_results = list(
        map(
            lambda x: to_treatment_result(treatment_plan, variable, year, result=x),
            list(filter(lambda x: x.get("action") is not None, deltas)),
        )
    )

    return (treatment_results, project_area_results)


def calculate_stand_deltas(
    baseline_dict: Dict[int, StandMetric],
    action_dict: Dict[int, StandMetric],
    action: Optional[TreatmentPrescriptionAction] = None,
) -> List[Dict[str, Any]]:
    results = []
    for stand_id, baseline in baseline_dict.items():
        action_metric = action_dict.get(stand_id)
        actual_action = action if stand_id in action_dict else None
        attribute_to_lookup = ImpactVariableAggregation.get_metric_attribute(
            ImpactVariableAggregation.MEAN
        )
        baseline_value = getattr(baseline, attribute_to_lookup)
        action_value = (
            getattr(action_metric, attribute_to_lookup) or baseline_value
            if action_metric
            else baseline_value
        )

        delta = calculate_delta(action_value, baseline_value)
        results.append(
            {
                "stand_id": stand_id,
                "action": actual_action,
                "aggregation": ImpactVariableAggregation.MEAN,
                "value": action_value,
                "baseline": baseline_value,
                "delta": delta,
            }
        )
    return results


def get_calculation_matrix(
    treatment_plan: TreatmentPlan,
    years: Optional[Iterable[int]] = None,
) -> List[Tuple]:
    actions = list(
        [
            TreatmentPrescriptionAction[x]
            for x in treatment_plan.tx_prescriptions.values_list(
                "action", flat=True
            ).distinct()
        ]
    )
    if not years:
        years = AVAILABLE_YEARS
    variables = list(ImpactVariable)
    return list(itertools.product(variables, actions, years))


def calculate_metrics(
    stands: QuerySet[Stand],
    variable: ImpactVariable,
    year: int,
    action: Optional[TreatmentPrescriptionAction] = None,
):
    datalayer = ImpactVariable.get_datalayer(
        impact_variable=variable,
        action=action,
        year=year,
    )
    return calculate_stand_zonal_stats(stands=stands, datalayer=datalayer)


def calculate_project_area_deltas(
    project_area: ProjectArea,
    baseline_dict: Dict[int, StandMetric],
    action_dict: Dict[int, StandMetric],
    action: TreatmentPrescriptionAction,
) -> List[Dict[str, Any]]:
    pass

    """
    PA = [s1, s2, s3]
    Baseline:
    - s1_C = 100 tons (avg of cells w/i stand)
    - s2_C = 200 tons
    - s3_C = 300 tons

    Post-tx: 
    - s1_C = 50 tons
    - s2_C = 200 tons
    - s3_C = 300 tons

    Per-stand deltas:
    - s1 = -50%
    - s2 = 0%
    - s3 =0%

    PA delta:
    (600-550)/600 = -8.3%
    (sum of all baselines - sum of actions) / sum of all baselines
    """
    # untreated stands just copy the values from baselines
    results = []
    stand_size = project_area.scenario.get_stand_size()
    stands_in_project_area = list(
        Stand.objects.within_polygon(project_area.geometry, stand_size).values_list(
            "id",
            flat=True,
        )
    )

    baseline_dict = {
        k: v for k, v in baseline_dict.items() if k in stands_in_project_area
    }

    action_dict = {k: v for k, v in action_dict.items() if k in stands_in_project_area}

    attribute = ImpactVariableAggregation.get_metric_attribute(
        ImpactVariableAggregation.MEAN
    )
    baseline_sum = sum(
        [
            getattr(stand_metric, attribute, 0) or 0
            for _stand_id, stand_metric in baseline_dict.items()
        ]
    )

    action_sum = sum(
        [
            getattr(stand_metric, attribute, 0) or 0
            for _stand_id, stand_metric in action_dict.items()
        ]
    )
    delta = (baseline_sum - action_sum) / (baseline_sum + 1)
    results.append(
        {
            "project_area_id": project_area.id,
            "aggregation": ImpactVariableAggregation.MEAN,
            "baseline": baseline_sum,
            "value": action_sum,
            "delta": delta,
            "action": action,
            "stand_count": len(action_dict),
        }
    )
    return results
