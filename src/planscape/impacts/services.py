import fiona
import logging
import itertools
import json
import shapely.geometry
import shapely.wkt
import os
import zipfile
from typing import Iterable, List, Optional, Dict, Tuple, Any
from django.conf import settings
from django.db import connection
from django.db import transaction
from django.db.models import Count, QuerySet
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
    for project in project_area_queryset:
        stand_project_qs = Stand.objects.within_polygon(project.geometry).all()
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
        defaults={
            "value": result.get("value"),
            "baseline": result.get("baseline"),
            "delta": result.get("delta"),
            "type": TreatmentResultType.DIRECT,
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

    baseline_metrics = calculate_baseline_metrics(
        treatment_plan=treatment_plan,
        variable=variable,
        year=year,
    )
    action_metrics = calculate_action_metrics(
        treatment_plan=treatment_plan,
        variable=variable,
        action=action,
        year=year,
    )

    aggregations = ImpactVariable.get_aggregations(impact_variable=variable)
    baseline_dict = {m.stand_id: m for m in baseline_metrics}
    action_dict = {m.stand_id: m for m in action_metrics}

    deltas = calculate_stand_deltas(
        baseline_dict=baseline_dict,
        action_dict=action_dict,
        aggregations=aggregations,
    )

    project_area_deltas = []
    for project_area in treatment_plan.scenario.project_areas.all():
        project_area_deltas.extend(
            calculate_project_area_deltas(
                project_area=project_area,
                baseline_dict=baseline_dict,
                action_dict=action_dict,
                aggregations=aggregations,
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
            deltas,
        )
    )

    return (treatment_results, project_area_results)


def calculate_stand_deltas(
    baseline_dict: Dict[int, StandMetric],
    action_dict: Dict[int, StandMetric],
    aggregations: List[ImpactVariableAggregation],
) -> List[Dict[str, Any]]:
    results = []
    for stand_id, baseline in baseline_dict.items():
        action = action_dict.get(stand_id)

        for agg in aggregations:
            attribute_to_lookup = ImpactVariableAggregation.get_metric_attribute(agg)
            baseline_value = getattr(baseline, attribute_to_lookup)
            action_value = (
                getattr(action, attribute_to_lookup) if action else baseline_value
            )
            delta = calculate_delta(action_value, baseline_value)
            results.append(
                {
                    "stand_id": stand_id,
                    "aggregation": agg,
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


def calculate_baseline_metrics(
    treatment_plan: TreatmentPlan,
    variable: ImpactVariable,
    year: int,
) -> QuerySet[StandMetric]:
    geometry = ProjectArea.objects.filter(scenario=treatment_plan.scenario).aggregate(
        geometry=UnionOp("geometry")
    )["geometry"]

    stands = Stand.objects.within_polygon(geometry)
    datalayer = ImpactVariable.get_datalayer(
        impact_variable=variable,
        year=year,
    )
    return calculate_stand_zonal_stats(
        stands=stands,
        datalayer=datalayer,
    )


def calculate_action_metrics(
    treatment_plan: TreatmentPlan,
    variable: ImpactVariable,
    action: TreatmentPrescriptionAction,
    year: int,
) -> QuerySet[StandMetric]:
    prescriptions = treatment_plan.tx_prescriptions.filter(
        action=action
    ).select_related(
        "stand",
        "treatment_plan",
        "project_area",
    )

    stand_ids = prescriptions.values_list("stand_id", flat=True)
    stands = Stand.objects.filter(id__in=stand_ids)
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
    aggregations: List[ImpactVariableAggregation],
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
        Stand.objects.within_polygon(project_area.geometry).values_list(
            "id",
            flat=True,
        )
    )

    baseline_dict = {
        k: v for k, v in baseline_dict.items() if k in stands_in_project_area
    }

    action_dict = {k: v for k, v in action_dict.items() if k in stands_in_project_area}

    for agg in aggregations:
        attribute = ImpactVariableAggregation.get_metric_attribute(agg)
        # # merges both dicts, keep action dicts if they clash
        new_action_dict = {**baseline_dict, **action_dict}
        baseline_sum = sum(
            [
                getattr(stand_metric, attribute)
                for _stand_id, stand_metric in baseline_dict.items()
            ]
        )

        action_sum = sum(
            [
                getattr(stand_metric, attribute)
                for _stand_id, stand_metric in new_action_dict.items()
            ]
        )
        delta = (baseline_sum - action_sum) / (baseline_sum + 1)
        results.append(
            {
                "project_area_id": project_area.id,
                "aggregation": agg,
                "baseline": baseline_sum,
                "value": action_sum,
                "delta": delta,
            }
        )
    return results


def generate_shapefile_for_treatment_plan(treatment_plan):
    """
    Generates shapefiles for the stands in a Treatment Plan and zips them for download.
    Returns the path to the generated zip file.
    """
    try:
        # Fetch data using raw SQL
        data = fetch_treatment_plan_data(treatment_plan.id)
        if not data:
            raise ValueError("No stands found for the specified Treatment Plan.")

        # Define schema
        schema = define_shapefile_schema()

        # Prepare output paths
        output_dir = os.path.join(settings.MEDIA_ROOT, "shapefiles", f"treatment_plan_{treatment_plan.id}")
        os.makedirs(output_dir, exist_ok=True)
        shapefile_path = os.path.join(output_dir, "treatment_plan.shp")

        # Write shapefile
        with fiona.open(
            shapefile_path, 'w', driver='ESRI Shapefile', crs='EPSG:3857', schema=schema
        ) as shp:
            for record in data:
                try:
                    geom = shapely.wkt.loads(record.pop('wkt_geom'))
                    properties = {k: record[k] for k in record}
                    shp.write({
                        'geometry': shapely.geometry.mapping(geom),
                        'properties': properties,
                    })
                except Exception as e:
                    log.error(f"Invalid geometry WKT: {record.get('wkt_geom')} - Error: {e}")
                    continue

        # Zip shapefile components
        zip_path = os.path.join(output_dir, f"treatment_plan_{treatment_plan.id}_shapefiles.zip")
        with zipfile.ZipFile(zip_path, "w") as zipf:
            for filename in os.listdir(output_dir):
                if filename.startswith("treatment_plan") and not filename.endswith(".zip"):
                    file_path = os.path.join(output_dir, filename)
                    zipf.write(file_path, filename)

        return zip_path

    except Exception as e:
        log.error(f"Error generating shapefile: {e}")
        raise

def fetch_treatment_plan_data(treatment_plan_id):
    """
    Fetches data for the specified treatment plan using raw SQL.
    """
    with connection.cursor() as cursor:
        sql = """
        SELECT
            ST_AsText(stand.geometry) AS wkt_geom,
            treatmentprescription.action,
            calculations.baseline_0,
            calculations.baseline_5,
            calculations.baseline_10,
            calculations.baseline_15,
            calculations.baseline_20,
            calculations.delta_0,
            calculations.delta_5,
            calculations.delta_10,
            calculations.delta_15,
            calculations.delta_20,
            stand.id,
            project_area.name AS project_area_name,
            stand.stand_size,
            treatmentprescription.treatment_plan_id,
            calculations.value_0,
            calculations.value_5,
            calculations.value_10,
            calculations.value_15,
            calculations.value_20,
            calculations.variable
        FROM stand
        JOIN treatmentprescription ON treatmentprescription.stand_id = stand.id
        JOIN project_area ON stand.project_area_id = project_area.id
        JOIN calculations ON calculations.stand_id = stand.id
        WHERE treatmentprescription.treatment_plan_id = %s
        """
        cursor.execute(sql, [treatment_plan_id])
        columns = [col[0] for col in cursor.description]
        data = [dict(zip(columns, row)) for row in cursor.fetchall()]
    return data

def define_shapefile_schema():
    """
    Defines the schema for the shapefile to be written by Fiona.
    """
    return {
        'geometry': 'Polygon',  # Adjust based on your actual geometry type
        'properties': {
            'action': 'str',
            'baseline_0': 'float',
            'baseline_5': 'float',
            'baseline_10': 'float',
            'baseline_15': 'float',
            'baseline_20': 'float',
            'delta_0': 'float',
            'delta_5': 'float',
            'delta_10': 'float',
            'delta_15': 'float',
            'delta_20': 'float',
            'id': 'int',
            'project_area_name': 'str',
            'stand_size': 'str',
            'treatment_plan_id': 'int',
            'value_0': 'float',
            'value_5': 'float',
            'value_10': 'float',
            'value_15': 'float',
            'value_20': 'float',
            'variable': 'str',
        },
    }