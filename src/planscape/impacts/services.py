import itertools
import json
import logging
from collections import defaultdict
from typing import Any, Dict, Iterable, List, Optional, Tuple

import rasterio
from actstream import action as actstream_action
from core.s3 import get_aws_session
from django.contrib.auth.models import AbstractUser
from django.contrib.gis.db.models import Union as UnionOp
from django.contrib.postgres.aggregates import ArrayAgg
from django.db import transaction
from django.db.models import Case, Count, F, QuerySet, Sum, When
from django.db.models.expressions import RawSQL
from planning.models import ProjectArea, Scenario
from rasterio.session import AWSSession
from stands.models import STAND_AREA_ACRES, Stand, StandMetric
from stands.services import calculate_stand_zonal_stats

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
    TreatmentResultType,
    TTreatmentPlanCloneResult,
    get_prescription_type,
)

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
    stand_size = scenario.get_stand_size()
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
    project_area_queryset = (
        ProjectArea.objects.filter(**pa_filter)
        .annotate(
            treatment_rank=RawSQL("COALESCE((data->>'treatment_rank')::int, 1)", [])
        )
        .order_by("treatment_rank")
    )
    project_areas_geometry = project_area_queryset.all().aggregate(
        geometry=UnionOp("geometry")
    )["geometry"]
    for project in project_area_queryset:
        project_areas.append(
            {
                "project_area_id": project.id,
                "project_area_name": project.name,
                "total_stand_count": project.stand_count,
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

    year_zero = (
        queryset.values_list("year", flat=True)
        .distinct("year")
        .order_by("year")
        .first()
        or 0
    )

    aggregated_values = (
        queryset.values("year", "variable")
        .annotate(
            relative_year=(F("year") - year_zero),
            value_dividend=Sum(F("value") * F("stand_count")),
            baseline_dividend=Sum(F("baseline") * F("stand_count")),
            sum_baselines=Sum("baseline"),
            divisor=Sum("stand_count"),
        )
        .annotate(
            delta=Case(
                When(sum_baselines=0, then=None),
                default=((F("sum_baselines") - Sum("value")) / F("sum_baselines")),
            ),
            value=Case(
                When(divisor=0, then=None),
                default=(F("value_dividend") / F("divisor")),
            ),
            baseline=Case(
                When(divisor=0, then=None),
                default=(F("baseline_dividend") / F("divisor")),
            ),
        )
    )

    impact_variables_indexes = {k: v for v, k in enumerate(impact_variables)}

    values = sorted(
        aggregated_values,
        key=lambda x: int(
            f"{x.get('year')}{impact_variables_indexes[x.get('variable')]}"
        ),
    )
    for value in values:
        value.pop("value_dividend")
        value.pop("baseline_dividend")
        value.pop("sum_baselines")
        value.pop("divisor")

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
        aggregation=(
            result.get("aggregation") if result else ImpactVariableAggregation.MEAN
        ),
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

    aws_session = AWSSession(get_aws_session())
    with rasterio.Env(aws_session):
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

    deltas_list = calculate_stand_deltas(
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
            lambda x: to_treatment_result(
                treatment_plan,
                variable,
                year,
                result=x,
            ),
            deltas_list,
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


def fill_impacts_for_untreated_stands(
    treatment_plan: TreatmentPlan,
    variable: ImpactVariable,
    year: int,
) -> List[TreatmentResult]:
    prescriptions = treatment_plan.tx_prescriptions.select_related(
        "stand",
        "treatment_plan",
        "scenario",
        "project_area",
    )
    treated_stand_ids = prescriptions.values_list("stand_id", flat=True)
    untreated_stand_ids = (
        treatment_plan.scenario.get_project_areas_stands()
        .exclude(id__in=treated_stand_ids)
        .values_list("stand_id", flat=True)
    )

    results = []
    for stand_id in untreated_stand_ids:
        results.append(
            {
                "stand_id": stand_id,
                "action": None,
                "aggregation": ImpactVariableAggregation.MEAN,
                "value": None,
                "baseline": None,
                "delta": 0,
            }
        )

    treatment_results = list(
        map(
            lambda x: to_treatment_result(
                treatment_plan,
                variable,
                year,
                result=x,
            ),
            results,
        )
    )

    return treatment_results


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
    variables = ImpactVariable.get_measurable_impact_variables()
    return list(itertools.product(variables, actions, years))


def get_calculation_matrix_wo_action(
    years: Optional[Iterable[int]] = None,
) -> List[Tuple]:
    if not years:
        years = AVAILABLE_YEARS
    variables = ImpactVariable.get_measurable_impact_variables()
    return list(itertools.product(variables, years))


def get_baseline_matrix(
    years: Optional[Iterable[int]] = None,
):
    if not years:
        years = AVAILABLE_YEARS
    variables = ImpactVariable.get_baseline_only_impact_variables()
    return list(itertools.product(variables, years))


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
    stands_in_project_area = list(
        project_area.get_stands().values_list("id", flat=True)
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


def classify_flame_length(fl_value: Optional[float]) -> str:
    """
    Converts numeric flame length into relative values.
    These cut-off boundaries match BehavePlus6 spreadsheet on GD.
    """
    if fl_value is None:
        return ""
    if fl_value < 2.0:
        return "Very Low"
    if fl_value < 4.0:
        return "Low"
    if fl_value < 8.0:
        return "Moderate"
    if fl_value < 12.0:
        return "High"
    if fl_value < 25.0:
        return "Very High"

    return "Extreme"


def classify_rate_of_spread(ros_value: Optional[float]) -> str:
    """
    Converts numeric rate of spread into relative values.
    These cut-off boundaries match BehavePlus6 spreadsheet on GD.
    """
    if ros_value is None:
        return ""
    if ros_value < 3.0:
        return "Very Low"
    if ros_value < 10.0:
        return "Low"
    if ros_value < 20.0:
        return "Moderate"
    if ros_value < 60.0:
        return "High"
    if ros_value < 100.0:
        return "Very High"

    return "Extreme"


def get_treatment_results_table_data(
    treatment_plan: TreatmentPlan, stand_id: int
) -> List[Dict[str, Any]]:
    """
    Retrieves a list of dictionaries, with each dictionary representing
    a year and its variables. Returns something like:
    [
      {
        "year": 2024,
        "flame_length": { ... },
        "rate_of_spread": { ... },
        ...
      },
      ...
    ]
    """
    # Fetch treatment results
    treated_results = TreatmentResult.objects.filter(
        treatment_plan=treatment_plan, stand_id=stand_id
    ).values("year", "variable", "value", "delta", "baseline")

    if not treated_results.exists():
        return []

    data_map = defaultdict(dict)

    for year in AVAILABLE_YEARS:
        flame_length = ImpactVariable.get_datalayer(
            impact_variable=ImpactVariable.FLAME_LENGTH,
            year=year,
        )
        rate_of_spread = ImpactVariable.get_datalayer(
            impact_variable=ImpactVariable.RATE_OF_SPREAD,
            year=year,
        )
        fl_metric = StandMetric.objects.get(stand_id=stand_id, datalayer=flame_length)
        ros_metric = StandMetric.objects.get(
            stand_id=stand_id, datalayer=rate_of_spread
        )

        data_map[year][ImpactVariable.FLAME_LENGTH] = {
            "value": None,
            "delta": None,
            "baseline": fl_metric.avg,
            "category": classify_flame_length(fl_metric.avg),
        }

        data_map[year][ImpactVariable.RATE_OF_SPREAD] = {
            "value": None,
            "delta": None,
            "baseline": ros_metric.avg,
            "category": classify_rate_of_spread(ros_metric.avg),
        }

    # Populate data_map with treatment results
    for row in treated_results:
        year = row["year"]
        variable = row["variable"]
        value = row["value"]
        delta = row["delta"]
        baseline = row["baseline"]

        data_map[year][variable] = {
            "value": value,
            "delta": delta,
            "baseline": baseline,
            "category": None,
        }

    # Format data into a list
    table_data = []

    for year in sorted(data_map.keys()):
        table_data.append({**data_map[year], "year": year})

    return table_data
