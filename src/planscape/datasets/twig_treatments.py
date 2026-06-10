import json
import logging
import re
import tempfile
from copy import deepcopy
from datetime import date
from typing import Any, Dict, Optional, TextIO
from uuid import uuid4

import requests
from core.gcs import get_bucket_and_key as get_gcs_bucket_and_key
from core.gcs import is_gcs_file
from core.requests import RequestSessionWrap
from django.conf import settings
from django.contrib.auth import get_user_model
from django.utils import timezone
from gis.core import fetch_geometry_type, get_layer_info
from gis.io import detect_mimetype
from google.cloud import storage
from organizations.models import Organization
from workspaces.models import Workspace

from datasets.models import (
    DataLayer,
    DataLayerHasStyle,
    DataLayerStatus,
    Dataset,
    MapServiceChoices,
    StorageTypeChoices,
    VisibilityOptions,
)
from datasets.services import geometry_from_info, get_storage_url

logger = logging.getLogger(__name__)

TWIG_TREATMENTS_MIMETYPE = "application/geo+json"

TWIG_TREATMENT_LAYER_NAMES = {
    "0-5": "Years Since Treatment: 0-5",
    "06-10": "Years Since Treatment: 06-10",
    "11-15": "Years Since Treatment: 11-15",
}


def get_request_client(session: Optional[requests.Session] = None):
    return session or RequestSessionWrap()


def get_query_url(api_url: str) -> str:
    api_url = api_url.rstrip("/")
    if api_url.endswith("/query"):
        return api_url
    return f"{api_url}/query"


def years_before(value: date, years: int) -> date:
    try:
        return value.replace(year=value.year - years)
    except ValueError:
        return value.replace(year=value.year - years, day=28)


def format_arcgis_timestamp(value: date) -> str:
    return value.strftime("%Y-%m-%d 00:00:00")


def build_twig_where_clauses(
    today: Optional[date] = None,
    status_filter: Optional[str] = None,
) -> Dict[str, str]:
    today = today or timezone.localdate()

    five_year_cutoff = years_before(today, 5)
    ten_year_cutoff = years_before(today, 10)
    fifteen_year_cutoff = years_before(today, 15)

    five_year = format_arcgis_timestamp(five_year_cutoff)
    ten_year = format_arcgis_timestamp(ten_year_cutoff)
    fifteen_year = format_arcgis_timestamp(fifteen_year_cutoff)

    where_clauses = {
        TWIG_TREATMENT_LAYER_NAMES["0-5"]: (
            f"treatment_date >= TIMESTAMP '{five_year}'"
        ),
        TWIG_TREATMENT_LAYER_NAMES["06-10"]: (
            f"treatment_date >= TIMESTAMP '{ten_year}' "
            f"AND treatment_date < TIMESTAMP '{five_year}'"
        ),
        TWIG_TREATMENT_LAYER_NAMES["11-15"]: (
            f"treatment_date >= TIMESTAMP '{fifteen_year}' "
            f"AND treatment_date < TIMESTAMP '{ten_year}'"
        ),
    }

    if status_filter:
        escaped_status = status_filter.replace("'", "''")
        where_clauses = {
            layer_name: f"({where_clause}) AND status = '{escaped_status}'"
            for layer_name, where_clause in where_clauses.items()
        }

    return where_clauses


def fetch_twig_count(
    api_url: str,
    where_clause: str,
    timeout: int = 120,
    session: Optional[requests.Session] = None,
) -> int:
    client = get_request_client(session)
    response = client.get(
        get_query_url(api_url),
        params={
            "where": where_clause,
            "returnCountOnly": "true",
            "f": "json",
        },
        headers={
            "User-Agent": "Planscape/1.0",
            "Accept": "application/json",
        },
        timeout=timeout,
    )
    response.raise_for_status()

    try:
        payload = response.json()
    except ValueError as exc:
        raise ValueError("Expected a JSON response from TWIG count query.") from exc

    if "count" not in payload:
        raise ValueError(f"Expected TWIG count response to include count: {payload}")

    return int(payload["count"])


def fetch_twig_feature_page(
    api_url: str,
    where_clause: str,
    result_offset: int,
    result_record_count: int,
    timeout: int = 120,
    session: Optional[requests.Session] = None,
) -> Dict[str, Any]:
    client = get_request_client(session)
    response = client.get(
        get_query_url(api_url),
        params={
            "where": where_clause,
            "outFields": "*",
            "returnGeometry": "true",
            "f": "geojson",
            "orderByFields": "objectid ASC",
            "resultOffset": result_offset,
            "resultRecordCount": result_record_count,
        },
        headers={
            "User-Agent": "Planscape/1.0",
            "Accept": "application/json",
        },
        timeout=timeout,
    )
    response.raise_for_status()

    try:
        payload = response.json()
    except ValueError as exc:
        raise ValueError("Expected a GeoJSON response from TWIG.") from exc

    if payload.get("type") != "FeatureCollection":
        raise ValueError("Expected a GeoJSON FeatureCollection from TWIG.")
    if not isinstance(payload.get("features"), list):
        raise ValueError("Expected TWIG FeatureCollection.features to be a list.")

    return payload


def write_twig_feature_collection_to_file(
    api_url: str,
    where_clause: str,
    output_file: TextIO,
    timeout: int = 120,
    page_size: int = 1000,
    session: Optional[requests.Session] = None,
) -> int:
    client = get_request_client(session)
    expected_count = fetch_twig_count(
        api_url=api_url,
        where_clause=where_clause,
        timeout=timeout,
        session=client,
    )

    logger.info(
        "Fetching %s TWIG features for where clause: %s",
        expected_count,
        where_clause,
    )

    actual_count = 0
    offset = 0
    first_feature = True

    output_file.write('{"type":"FeatureCollection","features":[')

    while offset < expected_count:
        page = fetch_twig_feature_page(
            api_url=api_url,
            where_clause=where_clause,
            result_offset=offset,
            result_record_count=page_size,
            timeout=timeout,
            session=client,
        )

        features = page.get("features", [])
        if not features:
            break

        for feature in features:
            if not first_feature:
                output_file.write(",")
            json.dump(feature, output_file, separators=(",", ":"))
            first_feature = False
            actual_count += 1

        logger.info(
            "Fetched %s of %s TWIG features",
            actual_count,
            expected_count,
        )

        offset += page_size

    output_file.write("]}")
    output_file.flush()

    return actual_count


def get_or_create_twig_dataset(
    dataset_name: str,
    organization_id: int,
) -> Dataset:
    user_model = get_user_model()
    created_by = user_model.objects.get(email=settings.DEFAULT_ADMIN_EMAIL)

    workspace, _created = Workspace.objects.get_or_create(
        name="Default",
        visibility=VisibilityOptions.PUBLIC,
    )

    dataset, _created = Dataset.objects.get_or_create(
        name=dataset_name,
        organization_id=organization_id,
        defaults={
            "created_by": created_by,
            "workspace": workspace,
            "visibility": VisibilityOptions.PUBLIC,
        },
    )

    return dataset


def upload_geojson_file_to_storage(
    storage_url: str,
    input_file: str,
) -> None:
    if not is_gcs_file(storage_url):
        raise ValueError(f"Unsupported datalayer storage URL: {storage_url}")

    bucket_name, object_name = get_gcs_bucket_and_key(storage_url)
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(object_name)
    blob.upload_from_filename(input_file, content_type=TWIG_TREATMENTS_MIMETYPE)


def slugify_layer_name(name: str) -> str:
    slug = name.lower()
    slug = re.sub(r"[^a-z0-9]+", "_", slug)
    return slug.strip("_")


def replace_twig_treatment_datalayer(
    dataset: Dataset,
    organization: Organization,
    name: str,
    input_file: str,
) -> DataLayer:
    from datasets.tasks import datalayer_uploaded

    user_model = get_user_model()
    created_by = user_model.objects.get(email=settings.DEFAULT_ADMIN_EMAIL)

    original_name = f"{slugify_layer_name(name)}.geojson"
    uuid = str(uuid4())
    storage_url = get_storage_url(
        organization_id=organization.pk,
        uuid=uuid,
        original_name=original_name,
        mimetype=TWIG_TREATMENTS_MIMETYPE,
    )

    existing_layers = DataLayer.dead_or_alive.filter(dataset=dataset, name=name)
    existing_datalayer = existing_layers.filter(deleted_at=None).first()
    
    layer_type, layer_info = get_layer_info(input_file=input_file)
    mimetype = detect_mimetype(input_file=input_file) or TWIG_TREATMENTS_MIMETYPE
    
    try:
        geometry_type = fetch_geometry_type(layer_type=layer_type, info=layer_info)
    except KeyError:
        if existing_datalayer and existing_datalayer.geometry_type:
            logger.warning(
                "Could not detect geometry type for TWIG layer %s; preserving existing geometry type %s.",
                name,
                existing_datalayer.geometry_type,
            )
            geometry_type = existing_datalayer.geometry_type
        else:
            logger.warning(
                "Could not detect geometry type for TWIG layer %s; defaulting to MULTIPOLYGON.",
                name,
            )
            geometry_type = "MULTIPOLYGON"
    
    upload_geojson_file_to_storage(
        storage_url=storage_url,
        input_file=input_file,
    )

    if existing_datalayer is not None:
        metadata = deepcopy(existing_datalayer.metadata) or {}
        category = existing_datalayer.category
        style_associations = [
            (association.style_id, association.default)
            for association in existing_datalayer.rel_styles.all()
        ]
    else:
        metadata = {}
        category = None
        style_associations = []

    existing_layers.delete()

    datalayer = DataLayer.objects.create(
        name=name,
        uuid=uuid,
        dataset=dataset,
        organization=organization,
        workspace=dataset.workspace,
        category=category,
        created_by=created_by,
        original_name=original_name,
        url=storage_url,
        type=layer_type,
        storage_type=StorageTypeChoices.DATABASE,
        geometry_type=geometry_type,
        geometry=geometry_from_info(layer_info, datalayer_type=layer_type),
        info=layer_info,
        mimetype=mimetype,
        metadata=metadata,
        map_service_type=MapServiceChoices.VECTORTILES,
        status=DataLayerStatus.PENDING,
    )

    DataLayerHasStyle.objects.bulk_create(
        [
            DataLayerHasStyle(
                datalayer=datalayer,
                style_id=style_id,
                default=default,
            )
            for style_id, default in style_associations
        ]
    )

    datalayer_uploaded.delay(datalayer.pk, status=DataLayerStatus.READY)
    return datalayer


def refresh_twig_treatment_layers(
    organization_id: int,
    dataset_name: str,
    api_url: str,
    timeout: int = 120,
    page_size: int = 1000,
    status_filter: Optional[str] = None,
) -> Dict[str, str]:
    organization = Organization.objects.get(pk=organization_id)
    dataset = get_or_create_twig_dataset(
        dataset_name=dataset_name,
        organization_id=organization_id,
    )

    refreshed_layers = {}
    where_clauses = build_twig_where_clauses(status_filter=status_filter)

    for layer_name, where_clause in where_clauses.items():
        logger.info("Refreshing TWIG treatment layer %s", layer_name)

        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            suffix=".geojson",
        ) as temp_file:
            feature_count = write_twig_feature_collection_to_file(
                api_url=api_url,
                where_clause=where_clause,
                output_file=temp_file,
                timeout=timeout,
                page_size=page_size,
            )

            logger.info(
                "Writing TWIG treatment layer %s with %s features",
                layer_name,
                feature_count,
            )

            datalayer = replace_twig_treatment_datalayer(
                dataset=dataset,
                organization=organization,
                name=layer_name,
                input_file=temp_file.name,
            )

        refreshed_layers[layer_name] = datalayer.url

    return refreshed_layers
