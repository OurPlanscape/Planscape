import logging
import itertools
import json
from rasterstats import zonal_stats
from typing import Iterable, List, Optional, Dict, Tuple, Any
from django.db import transaction
from django.db.models import Count
from django.contrib.gis.db.models import Union as UnionOp
from django.contrib.postgres.aggregates import ArrayAgg
from impacts.models import (
    AVAILABLE_YEARS,
    ImpactVariable,
    ImpactVariableAggregation,
    TAction,
    TTreatmentPlan,
    TTreatmentPlanCloneResult,
    TTreatmentPrescriptionEntity,
    TreatmentPlan,
    TreatmentPlanStatus,
    TreatmentPrescription,
    TreatmentPrescriptionAction,
    TreatmentResult,
    get_prescription_type,
)
from planning.models import ProjectArea, Scenario, TProjectArea, TScenario
from actstream import action as actstream_action
from stands.models import STAND_AREA_ACRES, TStand, Stand
from planscape.typing import TUser

log = logging.getLogger(__name__)


@transaction.atomic()
def create_treatment_plan(
    scenario: TScenario,
    name: str,
    created_by: TUser,
) -> TTreatmentPlan:
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
    treatment_plan: TTreatmentPlan,
    project_area: TProjectArea,
    stands: List[TStand],
    action: TAction,
    created_by: TUser,
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
    tx_prescription: TTreatmentPrescriptionEntity,
    new_treatment_plan: TTreatmentPlan,
    user: TUser,
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
    treatment_plan: TTreatmentPlan,
    user: TUser,
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
    treatment_plan: TTreatmentPlan,
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
    project_areas_geometry = project_area_queryset.all().aggregate(
        geometry=UnionOp("geometry")
    )["geometry"]
    for project in project_area_queryset:
        stand_project_qs = Stand.objects.filter(
            size=stand_size,
            geometry__intersects=project.geometry,
        )
        project_areas[project.id] = {
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

    data = {
        "planning_area_id": plan_area.id,
        "planning_area_name": plan_area.name,
        "scenario_id": scenario.id,
        "scenario_name": scenario.name,
        "treatment_plan_id": treatment_plan.pk,
        "treatment_plan_name": treatment_plan.name,
        "project_areas": list(project_areas.values()),
        "extent": project_areas_geometry.extent,
    }
    return data


def to_geojson(prescription: TreatmentPrescription) -> Dict[str, Any]:
    geometry = prescription.geometry.transform(3857, clone=True)
    return {
        "type": "Feature",
        "id": prescription.pk,
        "properties": {
            "treatment_plan_id": prescription.treatment_plan.pk,
            "treatment_prescription_id": prescription.pk,
            "project_area_id": prescription.project_area.pk,
            "stand_id": prescription.stand.pk,
            "type": prescription.type,
        },
        "geometry": json.loads(geometry.json),
    }


IMPACTS_RASTER_NODATA = -999


def clone_existing_results(
    treatment_plan: TreatmentPlan,
    variable: ImpactVariable,
    action: TreatmentPrescriptionAction,
    year: int,
) -> List[TreatmentResult]:
    """Clones TreatmentResults from others TreatmentPlans
    which `action`, `year`, `variable` and `stand` are the same to
    avoid re-calculations.
    """
    treatment_prescriptions = treatment_plan.tx_prescriptions.select_related(
        "stand"
    ).filter(action=action)

    stands_prescriptions = {
        treatment_prescription.stand.pk: treatment_prescription
        for treatment_prescription in treatment_prescriptions.iterator()
    }
    existing_results = (
        TreatmentResult.objects.filter(
            treatment_prescription__action=action,
            treatment_prescription__stand__in=stands_prescriptions.keys(),
            variable=variable,
            year=year,
        )
        .select_related("treatment_prescription", "treatment_prescription__stand")
        .distinct("treatment_prescription__stand__pk", "aggregation", "value", "delta")
        .values_list(
            "treatment_prescription__stand__pk", "aggregation", "value", "delta"
        )
    )

    copied_results = [
        TreatmentResult.objects.update_or_create(
            treatment_plan=treatment_plan,
            treatment_prescription=stands_prescriptions.get(other_result[0]),
            variable=variable,
            aggregation=other_result[1],
            year=year,
            value=other_result[2],
            delta=other_result[3],
        )[0]
        for other_result in existing_results.iterator()
    ]
    return copied_results


def to_treatment_results(
    result: Dict[str, Any],
    variable: ImpactVariable,
    year: int,
) -> List[TreatmentResult]:
    """Transforms the result/output of rasterstats (a zonal statistic record)
    into multiple TreamentResults. If a variable has more than one aggregament,
    this method will produce more than one result per stand.
    """
    properties: Dict[str, Any] = result.get("properties", {})
    treament_plan_id = properties.get("treatment_plan_id")
    tx_prescription_id = properties.get("treatment_prescription_id")
    aggregations = ImpactVariable.get_aggregations(variable)
    return list(
        [
            TreatmentResult.objects.update_or_create(
                treatment_plan_id=treament_plan_id,
                treatment_prescription_id=tx_prescription_id,
                variable=variable,
                aggregation=agg,
                year=year,
                defaults={
                    "value": properties.get(agg.lower()),
                    "delta": properties.get(f"delta_{agg.lower()}"),
                },
            )[0]
            for agg in aggregations
        ]
    )


def persist_impacts(
    zonal_statistics: List[Dict[str, Any]],
    variable: ImpactVariable,
    year: int,
) -> List[TreatmentResult]:
    return list(
        itertools.chain.from_iterable(
            map(lambda r: to_treatment_results(r, variable, year), zonal_statistics)
        )
    )


def calculate_impacts(
    treatment_plan: TreatmentPlan,
    variable: ImpactVariable,
    action: TreatmentPrescriptionAction,
    year: int,
) -> List[Dict[str, Any]]:
    prescriptions = treatment_plan.tx_prescriptions.filter(
        action=action
    ).select_related(
        "stand",
        "treatment_plan",
        "project_area",
    )

    already_calculated_prescriptions_ids = (
        TreatmentResult.objects.filter(
            treatment_prescription__in=prescriptions,
            variable=variable,
            year=year,
        )
        .select_related("treatment_prescription")
        .values_list("treatment_prescription__pk")
    )

    # Exclude TreatmentPrescriptions with TreatmentResult to avoid re-calculation
    prescriptions = prescriptions.exclude(pk__in=already_calculated_prescriptions_ids)

    if year not in AVAILABLE_YEARS:
        raise ValueError(f"Year {year} not supported")

    raster_path = ImpactVariable.get_impact_raster_path(
        impact_variable=variable,
        action=action,
        year=year,
    )
    baseline_path = ImpactVariable.get_baseline_raster_path(
        impact_variable=variable,
        year=year,
    )
    prescription_stands = list(map(to_geojson, prescriptions))
    agg = ImpactVariable.get_aggregations(variable)
    log.info(f"Calculating raster stats for {variable} with aggregations {agg}")
    baseline_stats = zonal_stats(
        prescription_stands,
        baseline_path,
        stats=agg,
        band=1,
        nodata=IMPACTS_RASTER_NODATA,
        geojson_out=True,
    )
    variable_stats = zonal_stats(
        prescription_stands,
        raster_path,
        stats=agg,
        band=1,
        nodata=IMPACTS_RASTER_NODATA,
        geojson_out=True,
    )
    return calculate_deltas(baseline_stats, variable_stats, agg)


def calculate_delta(value: float, base: float) -> float:
    if not base:
        base = 1
    return (value - base) / base


def calculate_deltas(
    baseline_zonal_stats,
    variable_zonal_stats,
    aggregations: List[ImpactVariableAggregation],
):
    baseline_dict = {
        f.get("properties", {}).get("stand_id"): f for f in baseline_zonal_stats
    }
    for i, f in enumerate(variable_zonal_stats):
        variable_props = f.get("properties", {})
        stand_id = variable_props.get("stand_id")
        baseline_props = baseline_dict.get(stand_id).get("properties")
        deltas = {
            f"delta_{agg}": calculate_delta(
                variable_props.get(agg),
                baseline_props.get(agg),
            )
            for agg in aggregations
        }
        variable_zonal_stats[i]["properties"] = {**variable_props, **deltas}
    return variable_zonal_stats


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
