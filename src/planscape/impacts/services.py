import fiona
import logging
import itertools
import json
import shapely.geometry
import shapely.wkt
import os
import zipfile
from fiona.crs import from_epsg
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


def fetch_treatment_plan_data(treatment_plan_id):
    """
    Fetches data for the specified treatment plan using raw SQL.
    """
    try:
        with connection.cursor() as cursor:
            sql = """
            WITH tx_result_year_0 AS (
                SELECT
                    tr.stand_id AS id,
                    tr.baseline AS baseline_0,
                    tr.value AS value_0,
                    tr.delta AS delta_0
                FROM impacts_treatmentresult tr
                WHERE tr.treatment_plan_id = %s
                AND tr.year = 2024
                AND tr.aggregation = 'MEAN'
            ),
            tx_result_year_5 AS (
                SELECT
                    tr.stand_id AS id,
                    tr.baseline AS baseline_5,
                    tr.value AS value_5,
                    tr.delta AS delta_5
                FROM impacts_treatmentresult tr
                WHERE tr.treatment_plan_id = %s
                AND tr.year = 2029
                AND tr.aggregation = 'MEAN'
            ),
            tx_result_year_10 AS (
                SELECT
                    tr.stand_id AS id,
                    tr.baseline AS baseline_10,
                    tr.value AS value_10,
                    tr.delta AS delta_10
                FROM impacts_treatmentresult tr
                WHERE tr.treatment_plan_id = %s
                AND tr.year = 2034
                AND tr.aggregation = 'MEAN'
            ),
            tx_result_year_15 AS (
                SELECT
                    tr.stand_id AS id,
                    tr.baseline AS baseline_15,
                    tr.value AS value_15,
                    tr.delta AS delta_15
                FROM impacts_treatmentresult tr
                WHERE tr.treatment_plan_id = %s
                AND tr.year = 2039
                AND tr.aggregation = 'MEAN'
            ),
            tx_result_year_20 AS (
                SELECT
                    tr.stand_id AS id,
                    tr.baseline AS baseline_20,
                    tr.value AS value_20,
                    tr.delta AS delta_20
                FROM impacts_treatmentresult tr
                WHERE tr.treatment_plan_id = %s
                AND tr.year = 2044
                AND tr.aggregation = 'MEAN'
            )
            SELECT
                ST_AsText(ss.geometry) AS wkt_geom,
                tr.action,
                tx0.baseline_0,
                tx5.baseline_5,
                tx10.baseline_10,
                tx15.baseline_15,
                tx20.baseline_20,
                tx0.delta_0,
                tx5.delta_5,
                tx10.delta_10,
                tx15.delta_15,
                tx20.delta_20,
                ss.id,
                pa.name AS project_area_name, 
                ss.size AS stand_size,
                tp.id AS treatment_plan_id,
                tx0.value_0,
                tx5.value_5,
                tx10.value_10,
                tx15.value_15,
                tx20.value_20,
                tr.variable
            FROM stands_stand ss
            JOIN impacts_treatmentresult tr ON tr.stand_id = ss.id
            JOIN impacts_treatmentplan tp ON tp.id = tr.treatment_plan_id
            JOIN impacts_treatmentprescription itp ON itp.stand_id = ss.id 
            JOIN planning_projectarea pa ON pa.id = itp.project_area_id 
            JOIN tx_result_year_0 tx0 ON tx0.id = ss.id
            JOIN tx_result_year_5 tx5 ON tx5.id = ss.id
            JOIN tx_result_year_10 tx10 ON tx10.id = ss.id
            JOIN tx_result_year_15 tx15 ON tx15.id = ss.id
            JOIN tx_result_year_20 tx20 ON tx20.id = ss.id
            WHERE tp.id = %s
            """
            cursor.execute(sql, [treatment_plan_id])
            columns = [col[0] for col in cursor.description]
            data = [dict(zip(columns, row)) for row in cursor.fetchall()]
        return data
    except Exception as e:
        log.error(f"Error fetching data for Treatment Plan {treatment_plan_id}: {e}")
        raise


def get_schema(data: list) -> dict:
    """
    Generates a Fiona schema dynamically based on the query results.
    """
    # Step 1: Check if the data is empty
    if not data:
        raise ValueError("No data available to generate the schema.")

    # Step 2: Use the first record to determine the schema
    first_record = data[0]

    # Step 3: Define a mapping from Python types to Fiona-compatible types
    type_mapping = {
        str: "str",      
        int: "int",      
        float: "float",  
    }

    # Step 4: Build the properties dictionary for all non-geometry fields
    properties = {}
    for key, value in first_record.items():
        if key != "wkt_geom":  
            # Infer the type of the value and map it to Fiona-compatible types
            python_type = type(value)
            fiona_type = type_mapping.get(python_type, "str")  # Default to "str" if type is unknown
            properties[key] = fiona_type

    # Step 5: Construct and return the schema dictionary
    schema = {
        "geometry": "Polygon",  
        "properties": properties,  
    }

    return schema


def generate_shapefile_path(treatment_plan_id):
    """
    Generates the path for the .zip shapefile export directory and file based on the treatment plan ID.
    """
    return (
        settings.OUTPUT_DIR
        / "shapefile"
        / f"treatment_plan_{treatment_plan_id}"
        / f"export_{treatment_plan_id}.zip"
    )


def generate_shapefile_for_treatment_plan(treatment_plan):
    """
    Generates a zipped shapefile for the stands in a Treatment Plan.
    Returns the path to the generated zip file.
    """
    try:
        # Log start of generation
        log.info(
            f"Starting shapefile generation for Treatment Plan {treatment_plan.id}"
        )

        # Fetch data using raw SQL
        data = fetch_treatment_plan_data(treatment_plan.id)
        if not data:
            raise ValueError(f"No stands found for Treatment Plan {treatment_plan.id}.")

        # Dynamically define schema
        schema = get_schema(data)

        # Prepare shapefile path
        shapefile_path = generate_shapefile_path(treatment_plan.id)

        # Write shapefile directly to a zipped archive
        with fiona.open(
            f"zip://{shapefile_path}",
            mode="w",
            driver="ESRI Shapefile",
            crs="EPSG:4269",
            schema=schema,
        ) as shp:
            for record in data:
                try:
                    # Separate geometry and properties
                    geom = wkt.loads(record["wkt_geom"])
                    properties = {
                        key: value for key, value in record.items() if key != "wkt_geom"
                    }

                    shp.write(
                        {
                            "geometry": shapely.geometry.mapping(
                                geom
                            ),  # Correct geometry mapping
                            "properties": properties,
                        }
                    )
                except Exception as e:
                    log.error(
                        f"Error processing record {record.get('id', 'unknown')} for Treatment Plan {treatment_plan.id}: {e}"
                    )
                    raise  # Stop processing on error

        log.info(
            f"Shapefile generation completed for Treatment Plan {treatment_plan.id}"
        )
        return shapefile_path

    except Exception as e:
        log.error(
            f"Error generating shapefile for Treatment Plan {treatment_plan.id}: {e}"
        )
        raise


"""
def get_schema(geojson: Dict[str, Any]) -> Dict[str, Any]:
    features = geojson.get("features", [])
    first = features[0]
    field_type_pairs = list(map(map_property, first.get("properties", {}).items()))
    schema = {
        "geometry": first.get("geometry", {}).get("type", "MultiPolygon")
        or "MultiPolygon",
        "properties": field_type_pairs,
    }
    return schema
"""