"""
The metadata a workspace upload can be edited with, as flat fields, and where
each one lives inside `DataLayer.metadata` for the map tooltip and legend.
"""

import copy
from typing import Any, Dict, Optional, Tuple

UPLOAD_METADATA_PATHS: Dict[str, Tuple[str, ...]] = {
    "description": ("metadata", "identification", "description"),
    "units": ("metadata", "identification", "keywords", "units"),
    "vintage": ("metadata", "identification", "date", "date"),
    "geographic_coverage": ("metadata", "identification", "geographicCoverage"),
    "source_url": ("metadata", "distribution", "download", "url"),
}


def _get_path(data: Any, path: Tuple[str, ...]) -> Any:
    for key in path:
        if not isinstance(data, dict):
            return None
        data = data.get(key)
    return data


def _remove_path(data: Dict[str, Any], path: Tuple[str, ...]) -> None:
    parents = []
    node: Any = data
    for key in path[:-1]:
        if not isinstance(node.get(key), dict):
            return
        parents.append((node, key))
        node = node[key]
    node.pop(path[-1], None)
    # drop the dicts this leaves empty, deepest first
    for parent, key in reversed(parents):
        if parent[key]:
            break
        del parent[key]


def _set_path(data: Dict[str, Any], path: Tuple[str, ...], value: Any) -> None:
    node = data
    for key in path[:-1]:
        if not isinstance(node.get(key), dict):
            node[key] = {}
        node = node[key]
    node[path[-1]] = value


def read_upload_metadata(metadata: Optional[Dict[str, Any]]) -> Dict[str, str]:
    values = {
        field: _get_path(metadata or {}, path)
        for field, path in UPLOAD_METADATA_PATHS.items()
    }
    units = values["units"]
    keywords = units.get("keywords") if isinstance(units, dict) else None
    values["units"] = next((unit for unit in keywords or [] if unit), None)
    return {
        field: value if isinstance(value, str) else ""
        for field, value in values.items()
    }


def write_upload_metadata(
    metadata: Optional[Dict[str, Any]], values: Dict[str, str]
) -> Dict[str, Any]:
    """Returns a copy of `metadata` with `values` applied; blank removes."""
    result = copy.deepcopy(metadata) if isinstance(metadata, dict) else {}
    for field, value in values.items():
        path = UPLOAD_METADATA_PATHS[field]
        value = value.strip()
        if not value:
            _remove_path(result, path)
        elif field == "units":
            _set_path(result, path, {"keywords": [value], "keywords_type": "unit"})
        else:
            _set_path(result, path, value)
    return result
