import itertools
import json
import logging
from collections import defaultdict
from pathlib import Path
from typing import Any, Collection, Dict, Iterable, List, Optional, Tuple, Union

import fiona
import rasterio
from actstream import action as actstream_action
from core.s3 import get_aws_session
from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.contrib.gis.db.models import Union as UnionOp
from django.contrib.postgres.aggregates import ArrayAgg
from django.db import transaction
from django.db.models import Case, Count, F, QuerySet, Sum, When
from django.db.models.expressions import RawSQL
from datasets.models import DataLayer, DataLayerType
from planning.models import PlanningArea, ProjectArea, Scenario
from rasterio.session import AWSSession
from stands.models import STAND_AREA_ACRES, pixels_from_size, Stand, StandMetric
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
    total_stands = 0
    treated_stands = 0
    for project in project_area_queryset:
        project_area_dict = {
            "project_area_id": project.id,
            "project_area_name": project.name,
            "total_stand_count": project.stand_count,
            "total_area_acres": project.stand_count * stand_area,
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
        project_treated_stands = sum(
            p["treated_stand_count"] for p in project_area_dict["prescriptions"]
        )
        project_treated_stands_area = project_treated_stands * stand_area
        project_area_dict.update(
            {
                "total_treated_stand_count": project_treated_stands,
                "total_treated_area_acres": project_treated_stands_area,
            }
        )
        project_areas.append(project_area_dict)

        total_stands += project.stand_count
        treated_stands += project_treated_stands

    total_area_acres = total_stands * stand_area
    total_treated_area_acres = treated_stands * stand_area

    prescriptions_qs = (
        TreatmentPrescription.objects.filter(**tp_filter)
        .values(
            "action",
        )
        .annotate(stand_count=Count("stand"))
    )
    prescriptions_data = [
        {
            "action": p["action"],
            "stand_count": p["stand_count"],
            "area_acres": p["stand_count"] * stand_area,
            "area_percent": (p["stand_count"] / total_stands) * 100,
        }
        for p in prescriptions_qs
    ]

    data = {
        "planning_area_id": plan_area.id,
        "planning_area_name": plan_area.name,
        "prescriptions": prescriptions_data,
        "scenario_id": scenario.id,
        "scenario_name": scenario.name,
        "treatment_plan_id": treatment_plan.pk,
        "treatment_plan_name": treatment_plan.name,
        "total_stand_count": total_stands,
        "total_area_acres": total_area_acres,
        "total_treated_stand_count": treated_stands,
        "total_treated_area_acres": total_treated_area_acres,
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
                default=((Sum("value") - F("sum_baselines")) / F("sum_baselines")),
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


def calculate_impacts_for_untreated_stands(
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
    untreated_stands = (
        treatment_plan.scenario.get_project_areas_stands()
        .exclude(id__in=treated_stand_ids)
        .with_webmercator()
    )

    aws_session = AWSSession(get_aws_session())
    with rasterio.Env(aws_session):
        baseline_metrics = calculate_metrics(
            stands=untreated_stands,
            variable=variable,
            year=year,
        )
    baseline_dict = {m.stand_id: m for m in baseline_metrics}

    # Calculating deltas using baseline_dict on both entries
    # because it will generate delta zero, which mean no change,
    # and set `value` and `baseline` to the same value.
    # For non-forested stands, `value`, `baseline` and `delta` will be null.
    deltas_list = calculate_stand_deltas(
        baseline_dict=baseline_dict,
        action_dict=baseline_dict,
        action=None,
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

    return treatment_results


def get_calculation_matrix(
    treatment_plan: TreatmentPlan,
    years: Optional[Collection[int]] = AVAILABLE_YEARS,
) -> List[Tuple]:
    actions = list(
        [
            TreatmentPrescriptionAction[x]
            for x in treatment_plan.tx_prescriptions.values_list(
                "action", flat=True
            ).distinct()
        ]
    )
    variables = list(ImpactVariable)
    return list(itertools.product(variables, actions, years))


def get_calculation_matrix_wo_action(
    years: Optional[Iterable[int]] = AVAILABLE_YEARS,
) -> List[Tuple]:
    variables = list(ImpactVariable)
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
    Total = 600 tons

    Post-tx:
    - s1_C = 50 tons
    - s2_C = 200 tons
    - s3_C = 300 tons
    Total = 550 tons

    Per-stand deltas:
    - s1 (50-100)/100 = -50%
    - s2 (200-200)/200 = 0%
    - s3 (300-300)/300 = 0%

    PA delta:
    (550-600)/600 = -8.3%
    (sum of actions - sum of all baselines) / sum of all baselines
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
    delta = calculate_delta(action_sum, baseline_sum)
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
        return "N/A"
    if fl_value <= 10.0:
        return "Very Low"
    if fl_value <= 40.0:
        return "Low"
    if fl_value <= 80.0:
        return "Moderate"
    if fl_value <= 120.0:
        return "High"
    if fl_value <= 250.0:
        return "Very High"

    return "Extreme"


def classify_rate_of_spread(ros_value: Optional[float]) -> str:
    """
    Converts numeric rate of spread into relative values.
    These cut-off boundaries match BehavePlus6 spreadsheet on GD.
    """
    if ros_value is None:
        return "N/A"
    if ros_value <= 20.0:
        return "Very Low"
    if ros_value <= 50.0:
        return "Low"
    if ros_value <= 200.0:
        return "Moderate"
    if ros_value <= 500.0:
        return "High"
    if ros_value <= 1500.0:
        return "Very High"

    return "Extreme"


def get_treatment_results_table_data(
    treatment_plan: TreatmentPlan,
    stand_id: int,
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
    datamap = defaultdict(dict)
    results = (
        TreatmentResult.objects.filter(
            treatment_plan=treatment_plan,
            stand_id=stand_id,
        )
        .order_by("stand", "variable", "year")
        .select_related("stand", "treatment_plan__scenario")
        .exclude(variable=ImpactVariable.FIRE_BEHAVIOR_FUEL_MODEL)
    )

    for result in results:
        try:
            stand_metric = StandMetric.objects.select_related("datalayer").get(
                stand_id=stand_id,
                datalayer__metadata__contains={
                    "modules": {
                        "impacts": {
                            "year": result.year,
                            "baseline": True,
                            "variable": result.variable,
                            "action": None,
                        }
                    }
                },
            )
        except StandMetric.DoesNotExist:
            stand_metric = None

        forested_rate = (
            float(stand_metric.count) / float(pixels_from_size(result.stand.size))
            if stand_metric
            else None
        )

        datamap[result.year][result.variable] = {
            "value": result.value,
            "delta": result.delta,
            "baseline": result.baseline,
            "category": get_category(result),
            "forested_rate": forested_rate,
        }
    table_data = []

    for year in sorted(datamap.keys()):
        table_data.append({**datamap[year], "year": year})
    return table_data


def get_export_path(treatment_plan: TreatmentPlan) -> str:
    return (
        settings.OUTPUT_DIR
        / "shapefile"
        / f"{treatment_plan.pk}"
        / f"{treatment_plan.pk}.gpkg"
    )


def get_treament_result_schema():
    numeric_fields_iterator = itertools.product(
        [i for i in ImpactVariable.numerical_variables()],
        AVAILABLE_YEARS,
    )
    # we don't want to export FBFM.
    other_fields_iterator = itertools.product(
        [
            i
            for i in ImpactVariable.categorical_variables()
            if i != ImpactVariable.FIRE_BEHAVIOR_FUEL_MODEL
        ],
        AVAILABLE_YEARS,
    )
    fields = list([(f"{i}_{year}", "float:4.2") for i, year in numeric_fields_iterator])
    other_fields = list(
        [(f"{i}_{year}", "str:64") for i, year in other_fields_iterator]
    )
    return {
        "geometry": "Polygon",
        "properties": [
            ("stand_id", "int"),
            ("stand_size", "str:64"),
            ("planning_area_id", "int"),
            ("planning_area_name", "str:256"),
            ("scenario_id", "int"),
            ("scenario_name", "str:256"),
            ("action", "str:64"),
            *fields,
            *other_fields,
        ],
    }


def tretment_result_to_json(
    stand: Stand,
    stand_result: Dict[str, Any],
    scenario: Scenario,
    planning_area: PlanningArea,
) -> Dict[str, Any]:
    return {
        "geometry": json.loads(stand.geometry.geojson),
        "properties": {
            "stand_id": stand.pk,
            "stand_size": scenario.get_stand_size(),
            "planning_area_id": planning_area.pk,
            "planning_area_name": planning_area.name,
            "scenario_id": scenario.pk,
            "scenario_name": scenario.name,
            **stand_result,
        },
    }


def get_category(treatment_result: TreatmentResult) -> Optional[str]:
    match treatment_result.variable:
        case ImpactVariable.FLAME_LENGTH:
            val = (
                treatment_result.value
                if treatment_result.action
                else treatment_result.baseline
            )
            return classify_flame_length(val)
        case ImpactVariable.RATE_OF_SPREAD:
            val = (
                treatment_result.value
                if treatment_result.action
                else treatment_result.baseline
            )
            return classify_rate_of_spread(val)
        case _:
            return None


def get_treatment_result_value(
    treatment_result: TreatmentResult,
) -> Optional[Union[float, str]]:
    match treatment_result.variable:
        case ImpactVariable.FLAME_LENGTH:
            val = (
                treatment_result.value
                if treatment_result.action
                else treatment_result.baseline
            )
            return classify_flame_length(val)
        case ImpactVariable.RATE_OF_SPREAD:
            val = (
                treatment_result.value
                if treatment_result.action
                else treatment_result.baseline
            )
            return classify_rate_of_spread(val)
        case _:
            return treatment_result.delta


def fetch_treatment_plan_data(
    treatment_plan: TreatmentPlan,
) -> Collection[Dict[str, Any]]:
    scenario = treatment_plan.scenario
    planning_area = scenario.planning_area

    results = (
        TreatmentResult.objects.filter(treatment_plan=treatment_plan)
        .order_by("stand", "variable", "year")
        .select_related("stand", "treatment_plan__scenario")
        .exclude(variable=ImpactVariable.FIRE_BEHAVIOR_FUEL_MODEL)
    )
    treatment_results_data = {r.stand_id: r for r in results}
    result_data = defaultdict(dict)
    stands = Stand.objects.filter(id__in=[r.stand_id for r in results])
    for result in results:
        field_name = f"{result.variable}_{result.year}"
        result_data[result.stand_id][field_name] = get_treatment_result_value(result)
        result_data[result.stand_id]["action"] = treatment_results_data[
            result.stand_id
        ].action

    return list(
        map(
            lambda stand: tretment_result_to_json(
                stand,
                result_data[stand.id],
                scenario,
                planning_area,
            ),
            stands,
        )
    )


def force_field_type(schema: Dict[str, Any], field_type: str) -> Dict[str, Any]:
    new_properties = []
    for field_name, type in schema.get("properties", []):
        type = type if type != "" else field_type
        new_properties.append((field_name, type))
    return {**schema, "properties": new_properties}


def match_schema(record: Dict[str, Any], schema: Dict[str, Any]):
    for key, _type in schema.get("properties", []):
        if key not in record.get("properties", {}):
            record["properties"][key] = None
    return record


def export_geopackage(treatment_plan: TreatmentPlan) -> str:
    bare_export_path = Path(get_export_path(treatment_plan))
    fiona_path = f"{str(bare_export_path)}.zip"
    data = fetch_treatment_plan_data(treatment_plan)
    treatment_result_schema = get_treament_result_schema()
    Path(fiona_path).unlink(missing_ok=True)
    if not bare_export_path.parent.exists():
        bare_export_path.parent.mkdir(parents=True)
    with fiona.open(
        fiona_path,
        "w",
        layer=f"treatment_plan_{treatment_plan.pk}",
        crs="EPSG:4326",
        driver="GPKG",
        schema=treatment_result_schema,
        allow_unsupported_drivers=True,
    ) as out:
        for record in data:
            record = match_schema(record, treatment_result_schema)
            out.write(
                {
                    "id": record.pop("id", None),
                    "geometry": record.pop("geometry", None),
                    "properties": {
                        key: value
                        for key, value in record.get("properties", {}).items()
                    },
                }
            )
    return str(fiona_path)
