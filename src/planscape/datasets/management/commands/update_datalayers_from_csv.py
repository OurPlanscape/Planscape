import csv
import io
from collections import defaultdict
from copy import deepcopy
from pathlib import Path
from typing import Any, Dict, List, Optional, TextIO

from django.core.management.base import BaseCommand, CommandError, CommandParser
from django.db import transaction
from google.cloud import storage

from core.gcs import get_bucket_and_key, is_gcs_file
from datasets.models import DataLayer, SimpleCategory
from planning.models import TreatmentGoalUsageType
from stands.services import MODEL_AGGREGATION_MAP

NAME = "Layer"
DATA_LAYER = "Data Layer"
BASE_LAYER = "Base Layer"
FORSYS = "ForSys (Priority Objective & Co-Benefit)"
CLIMATE_FORESIGHT = "Climate Forsight"
INCLUDE = "Include"
EXCLUDE = "Exclude"
ADVANCED_STAND_LEVEL_CONSTRAINT = "Adv. Stand-Level Constraint"
METRIC = "Metric See List"
CATEGORY = "Category"
DESCRIPTION = "Description"
DATASET = "Dataset Name"
DATA_CREATOR = "Data Creator"
GEOGRAPHIC_COVERAGE = "Geographic Coverage"
UNITS = "Units"
VINTAGE = "Vintage"
LEARN_MORE = "[Learn More](Hyperlink)"

COLUMNS = [
    NAME,
    DATA_LAYER,
    BASE_LAYER,
    FORSYS,
    CLIMATE_FORESIGHT,
    INCLUDE,
    EXCLUDE,
    ADVANCED_STAND_LEVEL_CONSTRAINT,
    METRIC,
    CATEGORY,
    DESCRIPTION,
    DATASET,
    DATA_CREATOR,
    GEOGRAPHIC_COVERAGE,
    UNITS,
    VINTAGE,
    LEARN_MORE,
]

EMPTY_VALUES = {"", "n/a", "na"}

# modules that also require the module in `Dataset.modules` to list a datalayer
DATASET_GATED_MODULES = ["forsys", "climate_foresight"]


def normalize(name: str) -> str:
    return " ".join(name.split()).casefold()


def clean_text(value: str) -> Optional[str]:
    value = value.strip()
    if value.casefold() in EMPTY_VALUES:
        return None
    return value


def any_or_none(*values: Optional[bool]) -> Optional[bool]:
    known = [value for value in values if value is not None]
    return any(known) if known else None


def get_dict(container: Dict[str, Any], key: str) -> Dict[str, Any]:
    value = container.get(key)
    if not isinstance(value, dict):
        value = {}
        container[key] = value
    return value


def get_module(modules: Dict[str, Any], name: str) -> Dict[str, Any]:
    module = modules.get(name)
    if not isinstance(module, dict):
        # a module key without `enabled` counts as enabled in `by_meta_module`
        module = {"enabled": False}
        modules[name] = module
    return module


def apply_update(metadata: Any, update: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merges `update` into a copy of `metadata`. `None` values mean "leave as is",
    keys the spreadsheet does not cover are never touched.
    """
    metadata = deepcopy(metadata) if isinstance(metadata, dict) else {}
    modules = metadata.get("modules")
    if not isinstance(modules, dict):
        modules = {}

    for name, enabled in update["modules"].items():
        if enabled is None or (not enabled and name not in modules):
            continue
        get_module(modules, name)["enabled"] = enabled

    capabilities_update = {
        capability: enabled
        for capability, enabled in update["capabilities"].items()
        if enabled is not None
    }
    if any(capabilities_update.values()) or update["metric"] or "forsys" in modules:
        forsys = get_module(modules, "forsys")
        capabilities = list(forsys.get("capabilities") or [])
        for capability, enabled in capabilities_update.items():
            if enabled and capability not in capabilities:
                capabilities.append(capability)
            elif not enabled and capability in capabilities:
                capabilities.remove(capability)
        if capabilities or "capabilities" in forsys:
            forsys["capabilities"] = capabilities
        if update["metric"]:
            forsys["metric_column"] = update["metric"]

    if modules:
        metadata["modules"] = modules

    identification_update = {
        key: value for key, value in update["identification"].items() if value
    }
    if identification_update or update["learn_more"]:
        source = get_dict(metadata, "metadata")
        if identification_update:
            identification = get_dict(source, "identification")
            for key in ("description", "geographicCoverage"):
                if key in identification_update:
                    identification[key] = identification_update[key]
            if "units" in identification_update:
                keywords = get_dict(identification, "keywords")
                keywords["units"] = {"keywords": [identification_update["units"]]}
            if "vintage" in identification_update:
                get_dict(identification, "date")["date"] = identification_update[
                    "vintage"
                ]
        if update["learn_more"]:
            download = get_dict(get_dict(source, "distribution"), "download")
            download["url"] = update["learn_more"]
            download.setdefault("name", update["data_creator"] or "Source")

    return metadata


def changed_paths(old: Any, new: Any, prefix: str = "") -> List[str]:
    if isinstance(new, dict) and (old is None or isinstance(old, dict)):
        old = old or {}
        changes = []
        for key in sorted(set(old) | set(new)):
            path = f"{prefix}.{key}" if prefix else key
            changes.extend(changed_paths(old.get(key), new.get(key), path))
        return changes
    if old == new:
        return []
    return [f"{prefix}: {shorten(old)} -> {shorten(new)}"]


def shorten(value: Any, size: int = 60) -> str:
    text = repr(value)
    return text if len(text) <= size else text[: size - 3] + "..."


class Command(BaseCommand):
    help = (
        "Updates datalayer modules, simple categories and descriptive metadata "
        "from the Planscape DataLayers spreadsheet, matching layers by name."
    )

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "csv_path", help="Path or gs:// URL of the CSV file."
        )
        parser.add_argument(
            "--dry-run",
            default=False,
            action="store_true",
            help="Report what would change without saving.",
        )

    def open_csv(self, csv_path: str) -> TextIO:
        if is_gcs_file(csv_path):
            bucket_name, object_name = get_bucket_and_key(csv_path)
            blob = storage.Client().bucket(bucket_name).get_blob(object_name)
            if blob is None:
                raise CommandError(f"File not found: {csv_path}")
            return io.StringIO(blob.download_as_text(encoding="utf-8-sig"), newline="")
        path = Path(csv_path)
        if not path.is_file():
            raise CommandError(f"File not found: {csv_path}")
        return path.open(encoding="utf-8-sig", newline="")

    def read_rows(self, csv_path: str):
        with self.open_csv(csv_path) as fp:
            reader = csv.reader(fp)
            # the spreadsheet export may have extra rows above the header
            for header in reader:
                header = [" ".join(column.split()) for column in header]
                if NAME in header:
                    break
            else:
                raise CommandError(f"Header with column '{NAME}' not found.")
            missing = [column for column in COLUMNS if column not in header]
            if missing:
                raise CommandError(f"Missing columns: {missing}.")
            indexes = {column: header.index(column) for column in COLUMNS}
            for row in reader:
                row = row + [""] * (len(header) - len(row))
                yield {column: row[index] for column, index in indexes.items()}

    def parse_bool(self, row: Dict[str, str], column: str) -> Optional[bool]:
        value = row[column].strip().casefold()
        if value == "true":
            return True
        if value == "false":
            return False
        if value:
            self.stderr.write(
                f" [NOK] '{row[NAME].strip()}' has invalid {column} '{row[column]}', ignoring."
            )
        return None

    def parse_metric(self, row: Dict[str, str]) -> Optional[str]:
        metric = clean_text(row[METRIC])
        if metric is None:
            return None
        metric = metric.casefold()
        if metric not in MODEL_AGGREGATION_MAP:
            self.stderr.write(
                f" [NOK] '{row[NAME].strip()}' has invalid metric '{metric}', ignoring."
            )
            return None
        return metric

    def parse_row(self, row: Dict[str, str]) -> Dict[str, Any]:
        include_flag = self.parse_bool(row, INCLUDE)
        exclude_flag = self.parse_bool(row, EXCLUDE)
        forsys_flag = self.parse_bool(row, FORSYS)
        return {
            "modules": {
                "map": any_or_none(
                    self.parse_bool(row, DATA_LAYER), self.parse_bool(row, BASE_LAYER)
                ),
                "forsys": forsys_flag,
                "climate_foresight": self.parse_bool(row, CLIMATE_FORESIGHT),
                "advanced_stand_level_constraint": self.parse_bool(
                    row, ADVANCED_STAND_LEVEL_CONSTRAINT
                ),
            },
            "capabilities": {
                TreatmentGoalUsageType.PRIORITY: forsys_flag,
                TreatmentGoalUsageType.SECONDARY_METRIC: forsys_flag,
                TreatmentGoalUsageType.INCLUSION_ZONE: include_flag,
                TreatmentGoalUsageType.EXCLUSION_ZONE: exclude_flag,
            },
            "metric": self.parse_metric(row),
            "category": clean_text(row[CATEGORY]),
            "identification": {
                "description": clean_text(row[DESCRIPTION]),
                "geographicCoverage": clean_text(row[GEOGRAPHIC_COVERAGE]),
                "units": clean_text(row[UNITS]),
                "vintage": clean_text(row[VINTAGE]),
            },
            "learn_more": clean_text(row[LEARN_MORE]),
            "data_creator": clean_text(row[DATA_CREATOR]),
        }

    def build_mapping(self, rows):
        """
        Maps layer name -> dataset name -> update. The dataset is `None` (any
        dataset) unless rows with the same layer name disagree, in which case
        the dataset name tells them apart.
        """
        rows_by_name = defaultdict(list)
        display_names = {}
        for row in rows:
            name = row[NAME].strip()
            if not name:
                continue
            key = normalize(name)
            rows_by_name[key].append((normalize(row[DATASET]), self.parse_row(row)))
            display_names.setdefault(key, name)

        mapping = {}
        for key, rows in rows_by_name.items():
            updates = [update for _, update in rows]
            if all(update == updates[0] for update in updates):
                mapping[key] = {None: updates[0]}
                continue

            updates_by_dataset = defaultdict(list)
            for dataset, update in rows:
                updates_by_dataset[dataset].append(update)
            if "" in updates_by_dataset or any(
                any(update != updates[0] for update in updates)
                for updates in updates_by_dataset.values()
            ):
                self.stderr.write(
                    f" [NOK] '{display_names[key]}' has conflicting rows, skipping."
                )
                continue
            mapping[key] = {
                dataset: updates[0] for dataset, updates in updates_by_dataset.items()
            }
            self.stdout.write(
                f" [OK] '{display_names[key]}' has rows for different datasets, matching by dataset name."
            )
        return mapping, display_names

    def handle(self, *args, **options):
        dry_run: bool = options["dry_run"]
        mapping, display_names = self.build_mapping(
            self.read_rows(options["csv_path"])
        )
        if not mapping:
            self.stdout.write("No rows with a layer name found.")
            return

        with transaction.atomic():
            categories = {}
            category_names = {
                update["category"]
                for updates in mapping.values()
                for update in updates.values()
                if update["category"]
            }
            for category_name in sorted(category_names):
                category, created = SimpleCategory.objects.get_or_create(
                    name=category_name
                )
                if created:
                    self.stdout.write(
                        f" [OK] created simple category '{category_name}'."
                    )
                categories[category_name] = category

            matches = defaultdict(int)
            missing_dataset_modules = defaultdict(set)
            updated = 0
            for datalayer in (
                DataLayer.objects.order_by("id")
                .select_related("dataset")
                .prefetch_related("simple_categories")
                .iterator(chunk_size=500)
            ):
                key = normalize(datalayer.name)
                if key not in mapping:
                    continue
                updates = mapping[key]
                dataset = None if None in updates else normalize(datalayer.dataset.name)
                if dataset not in updates:
                    continue
                matches[(key, dataset)] += 1
                update = updates[dataset]

                metadata = apply_update(datalayer.metadata, update)
                for module in DATASET_GATED_MODULES:
                    if metadata.get("modules", {}).get(module, {}).get(
                        "enabled"
                    ) and module not in (datalayer.dataset.modules or []):
                        missing_dataset_modules[datalayer.dataset.name].add(module)
                changes = changed_paths(datalayer.metadata or {}, metadata)
                if changes:
                    datalayer.metadata = metadata
                    datalayer.save(update_fields=["metadata", "updated_at"])

                if update["category"]:
                    current = sorted(
                        category.name for category in datalayer.simple_categories.all()
                    )
                    if current != [update["category"]]:
                        datalayer.simple_categories.set(
                            [categories[update["category"]]]
                        )
                        changes.append(
                            f"simple_categories: {current} -> {[update['category']]}"
                        )

                if not changes:
                    continue
                updated += 1
                self.stdout.write(
                    f" [OK] datalayer {datalayer.id} '{datalayer.name}':"
                )
                for change in changes:
                    self.stdout.write(f"      {change}")

            for (key, _), count in sorted(matches.items(), key=str):
                if count > 1:
                    self.stdout.write(
                        f" [OK] '{display_names[key]}' matched {count} datalayers."
                    )
            unmatched = sorted(
                display_names[key] + (f" (dataset '{dataset}')" if dataset else "")
                for key, updates in mapping.items()
                for dataset in updates
                if (key, dataset) not in matches
            )
            for name in unmatched:
                self.stderr.write(f" [NOK] no datalayer named '{name}'.")
            for dataset_name, modules in sorted(missing_dataset_modules.items()):
                self.stderr.write(
                    f" [NOK] dataset '{dataset_name}' does not list modules "
                    f"{sorted(modules)}, its datalayers will not show up there."
                )

            if dry_run:
                transaction.set_rollback(True)

        prefix = "[DRY RUN] " if dry_run else ""
        self.stdout.write(
            f"{prefix}Finished. Updated {updated} datalayers, "
            f"{sum(matches.values()) - updated} unchanged, "
            f"{len(unmatched)} names unmatched."
        )
