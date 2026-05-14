import json
import logging
import ssl
from pathlib import Path
from typing import Any, Dict, Optional

import requests
from django.conf import settings
from django.core.management import call_command
from django.utils import timezone
from requests.adapters import HTTPAdapter

from datasets.models import DataLayer

logger = logging.getLogger(__name__)

FORISK_LAYER_NAMES = {
    "Open": "Open Mills",
    "Closed": "Closed Mills",
    "Announced": "Announced Mills",
}
FORISK_PROPERTY_RENAMES = {
    "Recycled%": "recycledpercent",
}


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
    payload = response.json()

    if payload.get("type") != "FeatureCollection":
        raise ValueError("Expected a GeoJSON FeatureCollection from Forisk.")
    if not isinstance(payload.get("features"), list):
        raise ValueError("Expected FeatureCollection.features to be a list.")

    return payload


def write_forisk_mill_files(
    feature_collection: Dict[str, Any],
    output_dir: Path,
) -> Dict[str, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)

    output_files = {}
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
        output_file = output_dir / f"{layer_name.lower().replace(' ', '_')}.geojson"
        output_file.write_text(json.dumps(status_collection), encoding="utf-8")
        output_files[layer_name] = output_file

    return output_files


def ingest_forisk_mill_file(
    dataset_id: int,
    name: str,
    input_file: Path,
) -> None:
    DataLayer.objects.filter(dataset_id=dataset_id, name=name).update(
        deleted_at=timezone.now()
    )
    if not settings.FORISK_MILLS_PLANSCAPE_EMAIL:
        raise ValueError("FORISK_MILLS_PLANSCAPE_EMAIL is required.")
    if not settings.FORISK_MILLS_PLANSCAPE_PASSWORD:
        raise ValueError("FORISK_MILLS_PLANSCAPE_PASSWORD is required.")

    call_command(
        "datalayers",
        "create",
        name,
        input_file=str(input_file),
        dataset=dataset_id,
        map_service_type="VECTORTILES",
        email=settings.FORISK_MILLS_PLANSCAPE_EMAIL,
        password=settings.FORISK_MILLS_PLANSCAPE_PASSWORD,
        org=settings.FORISK_MILLS_PLANSCAPE_ORG,
        env=settings.FORISK_MILLS_PLANSCAPE_ENV,
    )


def refresh_forisk_mill_layers(
    dataset_id: int,
    sub_key: str,
    user_key: str,
    api_url: str,
    output_dir: Path,
    timeout: int = 120,
) -> Dict[str, Path]:
    feature_collection = fetch_forisk_feature_collection(
        sub_key=sub_key,
        user_key=user_key,
        api_url=api_url,
        timeout=timeout,
    )
    output_files = write_forisk_mill_files(
        feature_collection=feature_collection,
        output_dir=output_dir,
    )
    for layer_name, input_file in output_files.items():
        logger.info("Ingesting Forisk mill layer %s from %s", layer_name, input_file)
        ingest_forisk_mill_file(
            dataset_id=dataset_id,
            name=layer_name,
            input_file=input_file,
        )
    return output_files
