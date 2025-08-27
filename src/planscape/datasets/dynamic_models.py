from __future__ import annotations

import re
from typing import Dict, Optional, Tuple

from datasets.models import DataLayer
from django.apps import apps
from django.contrib.gis.db import models


def srid_from_crs(crs: Optional[str], default: int = 4326) -> int:
    if isinstance(crs, str):
        m = re.search(r"epsg\s*:\s*(\d+)", crs, re.I)
        if m:
            return int(m.group(1))
    return default


def geometry_field_from_fiona(geom_type: str) -> type[gis.GeometryField]:
    """
    Maps Fiona geometry string to GeoDjango field class.
    Strips Z/M suffixes if present (e.g., 'MultiPolygonZ').
    """
    base = re.sub(r"[ZM]+$", "", geom_type or "", flags=re.I).lower()
    return {
        "point": models.PointField,
        "multipoint": models.MultiPointField,
        "linestring": models.LineStringField,
        "multilinestring": models.MultiLineStringField,
        "polygon": models.PolygonField,
        "multipolygon": models.MultiPolygonField,
        "geometrycollection": models.GeometryCollectionField,
        "geometry": models.GeometryField,
        "unknown": models.GeometryField,
        "": models.GeometryField,
    }.get(base, models.GeometryField)


TYPE_MAP = {
    # using TextField here because we don't know field size.
    "int": models.IntegerField,
    "integer": models.IntegerField,
    "int32": models.IntegerField,
    "int64": models.BigIntegerField,
    "float": models.FloatField,
    "double": models.FloatField,
    "real": models.FloatField,
    "bool": models.BooleanField,
    "boolean": models.BooleanField,
    "date": models.DateField,
    "datetime": models.DateTimeField,
    "time": models.TimeField,
}


def field_from_fiona(
    field: str,
) -> Tuple[str, Optional[int], Optional[Tuple[int, int]]]:
    field = (field or "").strip().lower()
    base, char_len, dec = field, None, None
    # split on colon, e.g. 'str:254' or 'float:24.8'
    if ":" in field:
        base, arg = field.split(":", 1)
        if base == "str":
            try:
                char_len = int(arg)
            except ValueError:
                char_len = None
        elif base in ("float", "numeric", "decimal"):
            # float:24.8 -> use DecimalField if both present
            parts = arg.split(".")
            if len(parts) == 2 and parts[0].isdigit() and parts[1].isdigit():
                dec = (int(parts[0]), int(parts[1]))
    return base, char_len, dec


def qualify_table_name(schema: str, table: str) -> str:
    if not schema or not table:
        raise ValueError("Both schema and table are required.")
    return f'"{schema}"."{table}"'


def model_from_fional(
    datalayer: DataLayer,
    *,
    app_label: str = "dynamic_models",
    pg_schema: str,
    model_name: Optional[str] = None,
    table_name: Optional[str] = None,
    managed: bool = False,
) -> type[models.Model]:
    fiona_info = datalayer.info
    if fiona_info is None:
        raise ValueError("Empty Fiona info.")
    # this functions handles multilayers as well
    if "schema" not in fiona_info:
        _, layer = next(iter(fiona_info.items()))
    else:
        layer = fiona_info

    srid = srid_from_crs(layer.get("crs"))
    geom_type = (layer.get("schema", {}) or {}).get("geometry") or "Geometry"
    properties = (layer.get("schema", {}) or {}).get("properties") or {}

    model_name = datalayer.get_model_name()
    table_name = datalayer.table

    try:
        existing = apps.get_model(app_label=app_label, model_name=model_name)
        if existing is not None:
            return existing
    except LookupError:
        pass

    attrs: Dict[str, Any] = {
        "__module__": f"{app_label}.models",
        "objects": models.Manager(),
    }

    for field_name, field_type in properties.items():
        base, clen, decimal_spec = field_from_fiona(field_type)
        match base:
            case "str":
                attrs[field_name] = models.CharField(
                    max_length=int(clen or 255), null=True, blank=True
                )
            case "numeric" | "decimal":
                max_digits, decimal_places = (
                    decimal_spec
                    if decimal_spec
                    else (
                        10,
                        2,
                    )
                )
                attrs[field_name] = models.DecimalField(
                    max_digits=max_digits,
                    decimal_places=decimal_places,
                    null=True,
                    blank=True,
                )
            case _:
                field_cls = TYPE_MAP.get(
                    base, models.TextField if base == "str" else models.TextField
                )
                # fall back to TextField for unknowns
                if field_cls is models.TextField and base == "str":
                    attrs[field_name] = models.TextField(null=True, blank=True)
                else:
                    attrs[field_name] = field_cls(null=True, blank=True)

    geom_cls = geometry_field_from_fiona(geom_type)
    attrs["geom"] = geom_cls(srid=srid, null=False)

    attrs["id"] = models.BigAutoField(primary_key=True)

    # Meta
    Meta = type(
        "Meta",
        (),
        {
            "db_table": qualify_table_name(pg_schema, table_name),
            "managed": managed,
            "app_label": app_label,
        },
    )
    attrs["Meta"] = Meta

    ModelClass = type(model_name, (models.Model,), attrs)
    apps.register_model(app_label, ModelClass)
    return ModelClass
