"""Merge catalog fixtures using business identities, never source primary keys."""

import json
from collections import Counter, defaultdict

from django.conf import settings
from django.contrib.gis.db.models import GeometryField
from django.contrib.gis.gdal.error import GDALException
from django.contrib.gis.geos import GEOSGeometry
from django.contrib.gis.geos.error import GEOSException
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.management.base import CommandError
from django.db import transaction

from datasets.models import Category, DataLayer, DataLayerStatus, DataLayerType
from datasets.models import DataLayerHasStyle, Dataset, Style
from organizations.models import Organization
from planning.models import (
    TreatmentGoal,
    TreatmentGoalCategory,
    TreatmentGoalUsesDataLayer,
)

MODELS = (
    Organization,
    Dataset,
    Category,
    Style,
    TreatmentGoalCategory,
    DataLayer,
    TreatmentGoal,
    DataLayerHasStyle,
    TreatmentGoalUsesDataLayer,
)
KEYS = {
    Organization: ("name",),
    Dataset: ("organization", "name"),
    Style: ("organization", "name", "type"),
    DataLayer: ("dataset", "name", "type"),
    TreatmentGoalCategory: ("name",),
    TreatmentGoal: ("category", "group", "name"),
    DataLayerHasStyle: ("datalayer", "style"),
    TreatmentGoalUsesDataLayer: ("treatment_goal", "datalayer", "usage_type"),
}
IGNORED = {"created_at", "updated_at", "path", "depth", "numchild"}
# These describe the input to vector ingestion; table/outline/info are derived.
VECTOR_SOURCE_FIELDS = (
    "url",
    "hash",
    "type",
    "storage_type",
    "original_name",
    "mimetype",
)


def manager(model):
    return getattr(model, "dead_or_alive", model.objects)


class CatalogImporter:
    def __init__(self, fixture, source_env, target_env):
        self.rows = {model: {} for model in MODELS}
        self.parents = {}
        self.identities = {}
        self.existing = {model: {} for model in MODELS}
        self.id_map = {model: {} for model in MODELS}
        self.counts = defaultdict(Counter)
        self.vector_ids = []
        self.source_env = source_env
        self.target_env = target_env
        self._parse(fixture)
        self._validate_tree()
        self._validate_identities()
        self._index_destination()
        try:
            self.admin = get_user_model().objects.get(
                email=settings.DEFAULT_ADMIN_EMAIL
            )
        except (
            get_user_model().DoesNotExist,
            get_user_model().MultipleObjectsReturned,
        ) as exc:
            raise CommandError(
                "DEFAULT_ADMIN_EMAIL must identify one destination user."
            ) from exc

    @classmethod
    def from_file(cls, path, source_env, target_env):
        try:
            with open(path, encoding="utf-8") as backup:
                fixture = json.load(backup)
        except (OSError, ValueError) as exc:
            raise CommandError(f"Cannot read catalog backup: {exc}") from exc
        return cls(fixture, source_env, target_env)

    def _parse(self, fixture):
        if not isinstance(fixture, list):
            raise CommandError("Catalog backup must be a JSON list.")
        labels = {model._meta.label_lower: model for model in MODELS}
        for row in fixture:
            if not isinstance(row, dict) or row.get("model") not in labels:
                raise CommandError(f"Unsupported catalog fixture record: {row!r}")
            model = labels[row["model"]]
            pk, fields = row.get("pk"), row.get("fields")
            if type(pk) is not int or pk <= 0 or not isinstance(fields, dict):
                raise CommandError(
                    f"Invalid fixture record for {model._meta.label_lower}."
                )
            if pk in self.rows[model]:
                raise CommandError(
                    f"Duplicate source ID for {model._meta.label_lower}: {pk}"
                )
            if fields.get("workspace") is not None:
                raise CommandError(
                    "Workspace-owned records are not supported by catalog import."
                )
            model_fields = {
                field.name: field
                for field in model._meta.fields
                if not field.primary_key
            }
            if fields.keys() - model_fields.keys():
                raise CommandError(
                    f"Unknown fields in {model._meta.label_lower}: {fields.keys() - model_fields.keys()}"
                )
            values = {}
            for name, field in model_fields.items():
                if name in IGNORED or name == "created_by":
                    continue
                if name not in fields and not field.null and not field.has_default():
                    raise CommandError(
                        f"Missing {model._meta.label_lower}.{name} in source record {pk}."
                    )
                value = fields.get(name, field.get_default())
                if field.is_relation:
                    if value is None and not field.null:
                        raise CommandError(
                            f"Required reference {model._meta.label_lower}.{name} is null (record {pk})."
                        )
                    if value is not None and type(value) is not int:
                        raise CommandError(
                            f"Invalid reference {model._meta.label_lower}.{name}: {value!r}"
                        )
                    values[name] = value
                else:
                    try:
                        values[name] = field.to_python(value)
                        if isinstance(field, GeometryField) and value is not None:
                            geometry = GEOSGeometry(value)
                            if (
                                field.geom_type != "GEOMETRY"
                                and geometry.geom_type.upper() != field.geom_type
                            ):
                                raise ValidationError(
                                    f"Expected {field.geom_type} geometry."
                                )
                            if geometry.srid is None:
                                geometry.srid = field.srid
                            elif geometry.srid != field.srid:
                                geometry.transform(field.srid)
                            values[name] = geometry
                        if values[name] is None and not field.null:
                            raise ValidationError("This field cannot be null.")
                        if values[name] is not None and name != "table":
                            field.run_validators(values[name])
                    except (
                        ValidationError,
                        ValueError,
                        TypeError,
                        GEOSException,
                        GDALException,
                    ) as exc:
                        raise CommandError(
                            f"Invalid {model._meta.label_lower}.{name} in source record {pk}: {exc}"
                        ) from exc
            if model is Category:
                values["path"] = fields.get("path")
                values["depth"] = fields.get("depth")
            self.rows[model][pk] = values
        for model, rows in self.rows.items():
            for pk, fields in rows.items():
                for field in model._meta.fields:
                    if field.is_relation and field.name != "created_by":
                        value = fields.get(field.name)
                        if value is not None and value not in self.rows.get(
                            field.related_model, {}
                        ):
                            raise CommandError(
                                f"Missing source reference {model._meta.label_lower}.{field.name}={value} (record {pk})."
                            )

    def _validate_tree(self):
        paths = {}
        for pk, fields in self.rows[Category].items():
            path = fields["path"]
            if (
                not isinstance(path, str)
                or not path
                or len(path) % Category.steplen
                or type(fields["depth"]) is not int
                or fields["depth"] != len(path) // Category.steplen
                or any(
                    path[start : start + Category.steplen]
                    == Category.alphabet[0] * Category.steplen
                    for start in range(0, len(path), Category.steplen)
                )
                or any(char not in Category.alphabet for char in path)
            ):
                raise CommandError(
                    f"Invalid category path/depth for source record {pk}."
                )
            if path in paths:
                raise CommandError(f"Duplicate source category path: {path}")
            paths[path] = pk
        for pk, fields in self.rows[Category].items():
            parent_path = fields["path"][: -Category.steplen]
            parent = paths.get(parent_path)
            if parent_path and parent is None:
                raise CommandError(f"Missing category ancestor for source record {pk}.")
            if (
                parent is not None
                and self.rows[Category][parent]["dataset"] != fields["dataset"]
            ):
                raise CommandError(
                    f"Category {pk} and its ancestor belong to different datasets."
                )
            self.parents[pk] = parent

    def _source_identity(self, model, pk):
        if pk is None:
            return None
        cache_key = (model, pk)
        if cache_key in self.identities:
            return self.identities[cache_key]
        fields = self.rows[model][pk]
        if model is Category:
            parent = self.parents[pk]
            names = self._source_identity(Category, parent)[1] if parent else ()
            key = (
                self._source_identity(Dataset, fields["dataset"]),
                (*names, fields["name"]),
            )
        else:
            key = tuple(
                self._source_identity(
                    model._meta.get_field(name).related_model, fields[name]
                )
                if model._meta.get_field(name).is_relation
                else fields[name]
                for name in KEYS[model]
            )
        self.identities[cache_key] = key
        return key

    def _validate_identities(self):
        for model, rows in self.rows.items():
            seen = set()
            for pk in rows:
                key = self._source_identity(model, pk)
                if key in seen:
                    raise CommandError(
                        f"Duplicate source identity for {model._meta.label_lower}: {key!r}"
                    )
                seen.add(key)

    def _destination_identity(self, obj):
        model = type(obj)
        cache_key = (model, obj.pk)
        if cache_key in self.destination_identities:
            return self.destination_identities[cache_key]
        if model is Category:
            return (
                self._destination_identity(obj.dataset),
                tuple(
                    self.category_names[obj.path[:end]]
                    for end in range(
                        Category.steplen, len(obj.path) + 1, Category.steplen
                    )
                ),
            )
        key = []
        for name in KEYS[model]:
            value = getattr(obj, name)
            if model._meta.get_field(name).is_relation and value is not None:
                value = self._destination_identity(value)
            key.append(value)
        self.destination_identities[cache_key] = tuple(key)
        return tuple(key)

    def _identity_relations(self, model):
        names = ("dataset",) if model is Category else KEYS[model]
        relations = []
        for name in names:
            field = model._meta.get_field(name)
            if field.is_relation:
                relations.append(name)
                relations.extend(
                    f"{name}__{child}"
                    for child in self._identity_relations(field.related_model)
                )
        return relations

    def _is_catalog_record(self, obj):
        if getattr(obj, "workspace_id", None) is not None:
            return False
        names = ("dataset",) if type(obj) is Category else KEYS[type(obj)]
        return all(
            self._is_catalog_record(getattr(obj, name))
            for name in names
            if obj._meta.get_field(name).is_relation and getattr(obj, name) is not None
        )

    def _index_destination(self):
        self.destination_identities = {}
        self.category_names = dict(Category.objects.values_list("path", "name"))
        self.existing = {model: {} for model in MODELS}
        for model in MODELS:
            source_keys = {self._source_identity(model, pk) for pk in self.rows[model]}
            if not source_keys:
                continue
            for obj in (
                manager(model)
                .select_related(*self._identity_relations(model))
                .iterator()
            ):
                # Workspace catalogs must not match global catalog identities.
                if not self._is_catalog_record(obj):
                    continue
                key = self._destination_identity(obj)
                if key not in source_keys:
                    continue
                if key in self.existing[model]:
                    raise CommandError(
                        f"Ambiguous destination identity for {model._meta.label_lower}: {key!r}"
                    )
                self.existing[model][key] = obj

    def _values(self, model, fields):
        values = {}
        for name, value in fields.items():
            if name in IGNORED:
                continue
            field = model._meta.get_field(name)
            if field.is_relation:
                values[field.attname] = (
                    self.id_map[field.related_model][value]
                    if value is not None
                    else None
                )
            else:
                values[name] = value
        if any(field.name == "created_by" for field in model._meta.fields):
            values["created_by_id"] = self.admin.pk
        if model is DataLayer and values.get("url"):
            values["url"] = values["url"].replace(
                f"planscape-datastore-{self.source_env}",
                f"planscape-datastore-{self.target_env}",
            )
        return values

    @transaction.atomic
    def merge(self):
        # Bucket synchronization may take time; read destination state again on merge.
        self._index_destination()
        for model in MODELS:
            rows = self.rows[model].items()
            if model is Category:
                rows = sorted(rows, key=lambda row: row[1]["path"])
            for pk, fields in rows:
                key = self._source_identity(model, pk)
                obj = self.existing[model].get(key)
                if model is Category and obj is not None:
                    # Tree insertion/moves can change paths of previously indexed nodes.
                    obj.refresh_from_db()
                values = self._values(model, fields)
                rebuild = False
                if model is DataLayer:
                    # Never overwrite a destination table with a production table.
                    values["table"] = obj.table if obj else None
                    source_changed = obj is None or any(
                        getattr(obj, name) != values.get(name)
                        for name in VECTOR_SOURCE_FIELDS
                    )
                    if values.get("type") == DataLayerType.VECTOR:
                        if source_changed:
                            values["table"] = None
                        rebuild = values.get("status") == DataLayerStatus.READY and (
                            source_changed
                            or not obj.table
                            or obj.status != DataLayerStatus.READY
                        )
                        if not source_changed:
                            for name in ("geometry", "outline", "info"):
                                values[name] = getattr(obj, name)
                if obj is None:
                    if model is Category:
                        parent_pk = self.parents[pk]
                        obj = (
                            Category.objects.get(
                                pk=self.id_map[Category][parent_pk]
                            ).add_child(**values)
                            if parent_pk
                            else Category.add_root(**values)
                        )
                    else:
                        obj = manager(model).create(**values)
                    outcome = "created"
                else:
                    changed = [
                        name
                        for name, value in values.items()
                        if getattr(obj, name) != value
                    ]
                    if changed:
                        for name in changed:
                            setattr(obj, name, values[name])
                        obj.save(update_fields=[*changed, "updated_at"])
                        if model is Category and "order" in changed:
                            parent = obj.get_parent()
                            if parent:
                                obj.move(parent, pos="sorted-child")
                            else:
                                sibling = (
                                    Category.get_root_nodes().exclude(pk=obj.pk).first()
                                )
                                if sibling:
                                    obj.move(sibling, pos="sorted-sibling")
                        outcome = "updated"
                    else:
                        outcome = "unchanged"
                self.id_map[model][pk] = obj.pk
                self.counts[model._meta.label_lower][outcome] += 1
                if rebuild:
                    self.vector_ids.append(obj.pk)
        return self
