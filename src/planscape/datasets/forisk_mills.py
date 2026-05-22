import json
import logging
import ssl
from copy import deepcopy
from typing import Any, Dict, Optional
from uuid import uuid4

import requests
from core.gcs import get_bucket_and_key as get_gcs_bucket_and_key
from core.gcs import is_gcs_file
from django.conf import settings
from django.contrib.auth import get_user_model
from google.cloud import storage
from requests.adapters import HTTPAdapter

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
from gis.core import fetch_geometry_type, get_layer_info, with_vsi_prefix
from gis.io import detect_mimetype
from organizations.models import Organization
from workspaces.models import Workspace

logger = logging.getLogger(__name__)

FORISK_LAYER_NAMES = {
    "Open": "Open Mills",
    "Closed": "Closed Mills",
    "Announced": "Announced Mills",
}
FORISK_PROPERTY_RENAMES = {
    "Recycled%": "recycledpercent",
}
FORISK_MILLS_MIMETYPE = "application/geo+json"


class TLS13Adapter(HTTPAdapter):
    def init_poolmanager(self, *args, **kwargs):
        context = ssl.create_default_context()
        context.minimum_version = ssl.TLSVersion.TLSv1_3
        context.maximum_version = ssl.TLSVersion.TLSv1_3
        kwargs["ssl_context"] = context
        return super().init_poolmanager(*args, **kwargs)


def fetch_forisk_feature_collection(
    sub_key: str,
    user_key: str,
    api_url: str,
    timeout: int = 120,
    session: Optional[requests.Session] = None,
) -> Dict[str, Any]:
    client = session or requests.Session()
    if session is None:
        client.mount("https://", TLS13Adapter())

    response = client.get(
        api_url,
        params={
            "SubKey": sub_key,
            "Userkey": user_key,
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
        raise ValueError("Expected a JSON response from Forisk.") from exc

    if payload.get("type") != "FeatureCollection":
        raise ValueError("Expected a GeoJSON FeatureCollection from Forisk.")
    if not isinstance(payload.get("features"), list):
        raise ValueError("Expected FeatureCollection.features to be a list.")

    return payload


def split_forisk_mill_collections(
    feature_collection: Dict[str, Any],
) -> Dict[str, Dict[str, Any]]:
    collections = {}
    for status, layer_name in FORISK_LAYER_NAMES.items():
        features = []
        for feature in feature_collection["features"]:
            properties = feature.get("properties") or {}
            if properties.get("Status") != status:
                continue

            normalized_properties = {
                FORISK_PROPERTY_RENAMES.get(key, key): value
                for key, value in properties.items()
            }
            features.append(
                {
                    **feature,
                    "properties": normalized_properties,
                }
            )

        status_collection = {
            **feature_collection,
            "features": features,
        }
        collections[layer_name] = status_collection

    return collections


def fetch_forisk_mill_collections(
    sub_key: str,
    user_key: str,
    api_url: str,
    timeout: int = 120,
) -> Dict[str, Dict[str, Any]]:
    feature_collection = fetch_forisk_feature_collection(
        sub_key=sub_key,
        user_key=user_key,
        api_url=api_url,
        timeout=timeout,
    )
    return split_forisk_mill_collections(
        feature_collection=feature_collection,
    )


def get_or_create_forisk_dataset(
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


def upload_geojson_to_storage(
    storage_url: str,
    feature_collection: Dict[str, Any],
) -> None:
    if not is_gcs_file(storage_url):
        raise ValueError(f"Unsupported datalayer storage URL: {storage_url}")

    data = json.dumps(feature_collection)
    bucket_name, object_name = get_gcs_bucket_and_key(storage_url)
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(object_name)
    blob.upload_from_string(data, content_type=FORISK_MILLS_MIMETYPE)


def replace_forisk_mill_datalayer(
    dataset: Dataset,
    organization: Organization,
    name: str,
    feature_collection: Dict[str, Any],
) -> DataLayer:
    from datasets.tasks import datalayer_uploaded

    user_model = get_user_model()
    created_by = user_model.objects.get(email=settings.DEFAULT_ADMIN_EMAIL)
    original_name = f"{name.lower().replace(' ', '_')}.geojson"
    uuid = str(uuid4())
    storage_url = get_storage_url(
        organization_id=organization.pk,
        uuid=uuid,
        original_name=original_name,
        mimetype=FORISK_MILLS_MIMETYPE,
    )

    upload_geojson_to_storage(
        storage_url=storage_url,
        feature_collection=feature_collection,
    )

    vsi_input_file = with_vsi_prefix(storage_url)
    layer_type, layer_info = get_layer_info(input_file=vsi_input_file)
    mimetype = detect_mimetype(input_file=vsi_input_file) or FORISK_MILLS_MIMETYPE
    geometry_type = fetch_geometry_type(layer_type=layer_type, info=layer_info)

    existing_layers = DataLayer.dead_or_alive.filter(dataset=dataset, name=name)
    existing_datalayer = existing_layers.filter(deleted_at=None).first()
    if existing_datalayer is not None:
        metadata = deepcopy(existing_datalayer.metadata) or {}
        style_associations = [
            (association.style_id, association.default)
            for association in existing_datalayer.rel_styles.all()
        ]
    else:
        metadata = {}
        style_associations = []

    existing_layers.delete()
    storage_type = StorageTypeChoices.DATABASE
    datalayer = DataLayer.objects.create(
        name=name,
        uuid=uuid,
        dataset=dataset,
        organization=organization,
        workspace=dataset.workspace,
        created_by=created_by,
        original_name=original_name,
        url=storage_url,
        type=layer_type,
        storage_type=storage_type,
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


def refresh_forisk_mill_layers(
    organization_id: int,
    dataset_name: str,
    sub_key: str,
    user_key: str,
    api_url: str,
    timeout: int = 120,
) -> Dict[str, str]:
    organization = Organization.objects.get(pk=organization_id)
    dataset = get_or_create_forisk_dataset(
        dataset_name=dataset_name,
        organization_id=organization_id,
    )
    collections = fetch_forisk_mill_collections(
        sub_key=sub_key,
        user_key=user_key,
        api_url=api_url,
        timeout=timeout,
    )
    refreshed_layers = {}
    for layer_name, feature_collection in collections.items():
        logger.info("Refreshing Forisk mill layer %s", layer_name)
        datalayer = replace_forisk_mill_datalayer(
            dataset=dataset,
            organization=organization,
            name=layer_name,
            feature_collection=feature_collection,
        )
        refreshed_layers[layer_name] = datalayer.url
    return refreshed_layers
