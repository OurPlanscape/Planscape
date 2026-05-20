import json
import os
import shutil
from concurrent.futures import ThreadPoolExecutor, as_completed

from django.conf import settings
from django.db import close_old_connections
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError

from datasets.models import (
    Category,
    DataLayer,
    DataLayerHasStyle,
    DataLayerStatus,
    DataLayerType,
    Dataset,
    Style,
)
from datasets.tasks import process_datalayer
from organizations.models import Organization
from planning.models import TreatmentGoal, TreatmentGoalUsesDataLayer


class Command(BaseCommand):
    help = "Resets local development catalog data and loads the latest catalog backup fixture."

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-post-process",
            action="store_true",
            help="Load backup data without rebuilding vector datastore tables.",
        )
        parser.add_argument(
            "--workers",
            type=int,
            default=8,
            help="Number of parallel workers for vector post-processing. Default: 8.",
        )

    def sanitize_backup_fixture(self, file_path: str) -> None:
        with open(file_path, "r", encoding="utf-8") as fh:
            data = json.load(fh)

        if not isinstance(data, list):
            raise CommandError("Backup fixture format is invalid: expected a list of objects.")

        for item in data:
            fields = item.get("fields")
            if not isinstance(fields, dict):
                continue

            if "created_by" in fields:
                fields["created_by"] = 1

            if item.get("model") == "datasets.datalayer" and "table" in fields:
                fields.pop("table")

        with open(file_path, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2)

    def handle(self, *args, **kwargs):
        if settings.ENV != "local":
            raise CommandError(
                f"This command can only be run in local environment. Current ENV={settings.ENV}"
            )

        TreatmentGoalUsesDataLayer.objects.all().delete()
        TreatmentGoal.objects.all().delete()
        DataLayerHasStyle.objects.all().delete()
        DataLayer.objects.all().delete()
        Category.objects.all().delete()
        Style.objects.all().delete()
        Dataset.objects.all().delete()
        Organization.objects.all().delete()

        backups_dir = os.path.join(settings.BACKUPS_PATH)
        if not os.path.exists(backups_dir):
            raise CommandError("BACKUPS_PATH is not configured or the directory does not exist.")

        backup_file = os.path.join(backups_dir, "latest_catalog_backup.json")
        if not os.path.exists(backup_file):
            raise CommandError(
                f"Latest catalog backup not found at {backup_file}."
            )

        tmp_backup = "/tmp/latest_catalog_backup.json"
        shutil.copy(backup_file, tmp_backup)

        self.stdout.write(
            "Sanitizing latest backup fixture: setting created_by=1 and removing datalayer.table values."
        )
        self.sanitize_backup_fixture(tmp_backup)

        call_command("loaddata", tmp_backup)

        if kwargs["skip_post_process"]:
            self.stdout.write(
                self.style.WARNING(
                    "Loaded latest catalog backup without rebuilding vector datastore tables."
                )
            )
            return

        ready_vector_layers = DataLayer.objects.filter(
            type=DataLayerType.VECTOR,
            status=DataLayerStatus.READY,
        )
        layer_count = ready_vector_layers.count()
        worker_count = max(1, min(kwargs["workers"], layer_count or 1))

        self.stdout.write(
            f"Rebuilding datastore tables for {layer_count} ready vector datalayers "
            f"using {worker_count} workers."
        )

        processing_errors = 0
        vector_layers = list(ready_vector_layers.values_list("pk", "name"))

        with ThreadPoolExecutor(max_workers=worker_count) as executor:
            futures = {
                executor.submit(self.process_vector_layer, pk): (index, pk, name)
                for index, (pk, name) in enumerate(vector_layers, start=1)
            }

            for future in as_completed(futures):
                index, pk, name = futures[future]
                try:
                    future.result()
                except Exception as exc:
                    processing_errors += 1
                    self.stderr.write(
                        self.style.ERROR(
                            f"[{index}/{layer_count}] Post-processing datalayer {pk} "
                            f"({name}) raised an error: {exc}"
                        )
                    )
                else:
                    self.stdout.write(
                        f"[{index}/{layer_count}] Processed datalayer {pk}: {name}"
                    )

        failed_count = DataLayer.objects.filter(
            type=DataLayerType.VECTOR,
            status=DataLayerStatus.FAILED,
        ).count()
        missing_table_count = DataLayer.objects.filter(
            type=DataLayerType.VECTOR,
            status=DataLayerStatus.READY,
            table__isnull=True,
        ).count()

        if failed_count or missing_table_count or processing_errors:
            self.stdout.write(
                self.style.WARNING(
                    "Finished mock data load with post-processing warnings: "
                    f"{failed_count} failed, "
                    f"{missing_table_count} ready without datastore tables, "
                    f"{processing_errors} raised errors."
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Finished mock data load and rebuilt {layer_count} vector datastore tables."
                )
            )

    def process_vector_layer(self, datalayer_id: int):
        close_old_connections()
        try:
            process_datalayer(datalayer_id)
        finally:
            close_old_connections()
