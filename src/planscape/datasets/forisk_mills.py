import json
import logging
import ssl
from pathlib import Path
from typing import Any, Dict, Optional

import requests
from requests.adapters import HTTPAdapter

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


def refresh_forisk_mill_files(
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
    return output_files
