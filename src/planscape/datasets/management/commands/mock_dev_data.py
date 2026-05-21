import json
import os
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed

from django.conf import settings
from django.contrib.auth.models import User
from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import close_old_connections, transaction
from google.cloud import storage

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
    help = "Resets local development catalog data and loads a catalog backup fixture."

    def add_arguments(self, parser):
        parser.add_argument(
            "--skip-post-process",
            action="store_true",
            help="Load backup data without rebuilding vector datastore tables.",
        )
        parser.add_argument(
            "--workers",
            type=int,
            default=4,
            help="Number of parallel workers for vector post-processing. Default: 4.",
        )
        parser.add_argument(
            "--backup-url",
            default="gs://planscape-backups/20260416_203907_catalog_backup.json",
            help=(
                "Authenticated GCS URL for the catalog backup fixture. "
                "Only gs:// URLs are supported."
            ),
        )
        parser.add_argument(
            "--created-by-user-id",
            type=int,
            help=(
                "User ID to assign to fixture created_by fields. "
                "Defaults to a local dev user."
            ),
        )

    def sanitize_backup_fixture(self, file_path: str, created_by_user_id: int) -> None:
        with open(file_path, "r", encoding="utf-8") as fh:
            data = json.load(fh)

        if not isinstance(data, list):
            raise CommandError(
                "Backup fixture format is invalid: expected a list of objects."
            )

        for item in data:
            fields = item.get("fields")
            if not isinstance(fields, dict):
                continue

            # Make catalog fixtures loadable against an arbitrary local dev DB.
            if "created_by" in fields:
                fields["created_by"] = created_by_user_id

            if item.get("model") == "datasets.datalayer" and "table" in fields:
                fields.pop("table")

        with open(file_path, "w", encoding="utf-8") as fh:
            json.dump(data, fh, indent=2)

    def handle(self, *args, **kwargs):
        if settings.ENV != "local":
            raise CommandError(
                f"This command can only be run in local environment. Current ENV={settings.ENV}"
            )

        if kwargs["workers"] < 1:
            raise CommandError("--workers must be greater than or equal to 1.")

        backup_url = kwargs.get("backup_url")
        created_by_user = self.get_created_by_user(kwargs.get("created_by_user_id"))

        tmp_backup_fd, tmp_backup = tempfile.mkstemp(suffix=".json")
        os.close(tmp_backup_fd)
        try:
            self.stdout.write(f"Downloading catalog backup from {backup_url}...")
            self.download_backup_fixture(backup_url, tmp_backup)

            self.stdout.write(
                "Sanitizing backup fixture: "
                f"setting created_by={created_by_user.pk} and removing "
                "datalayer.table values."
            )
            self.sanitize_backup_fixture(tmp_backup, created_by_user.pk)

            # Do not clear existing local data until the backup is downloaded and valid.
            with transaction.atomic():
                self.reset_catalog_data()
                call_command("loaddata", tmp_backup)
        finally:
            try:
                os.remove(tmp_backup)
            except OSError:
                pass

        if kwargs["skip_post_process"]:
            self.stdout.write(
                self.style.WARNING(
                    "Loaded catalog backup without rebuilding vector datastore tables."
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
                    result = future.result()
                except Exception as exc:
                    processing_errors += 1
                    self.stderr.write(
                        self.style.ERROR(
                            f"[{index}/{layer_count}] Post-processing datalayer {pk} "
                            f"({name}) raised an error: {exc}"
                        )
                    )
                else:
                    if result["status"] == DataLayerStatus.FAILED:
                        self.stderr.write(
                            self.style.ERROR(
                                f"[{index}/{layer_count}] Datalayer {pk} ({name}) failed."
                            )
                        )
                    elif not result["table"]:
                        self.stdout.write(
                            self.style.WARNING(
                                f"[{index}/{layer_count}] Datalayer {pk} ({name}) "
                                "finished without a datastore table."
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

    def download_backup_fixture(self, backup_url: str, destination_path: str) -> None:
        if not backup_url.startswith("gs://"):
            raise CommandError("Unsupported backup URL format. Use gs:// only.")

        path = backup_url[len("gs://") :]
        if "/" not in path:
            raise CommandError(
                "Unsupported backup URL format. Expected gs://bucket/path."
            )

        bucket_name, blob_name = path.split("/", 1)
        if not bucket_name or not blob_name:
            raise CommandError(
                "Unsupported backup URL format. Expected gs://bucket/path."
            )

        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        blob.download_to_filename(destination_path)

    def get_created_by_user(self, user_id: int | None) -> User:
        if user_id is not None:
            try:
                return User.objects.get(pk=user_id)
            except User.DoesNotExist as exc:
                raise CommandError(f"User {user_id} does not exist.") from exc

        user = (
            User.objects.filter(is_superuser=True).order_by("pk").first()
            or User.objects.filter(is_staff=True).order_by("pk").first()
            or User.objects.order_by("pk").first()
        )
        if user:
            return user

        return User.objects.create_user(
            username="local-dev",
            email="local-dev@planscape.local",
        )

    def reset_catalog_data(self) -> None:
        TreatmentGoalUsesDataLayer.objects.all().delete()
        TreatmentGoal.objects.all().delete()
        DataLayerHasStyle.objects.all().delete()
        DataLayer.objects.all().delete()
        Category.objects.all().delete()
        Style.objects.all().delete()
        Dataset.objects.all().delete()
        Organization.objects.all().delete()

    def process_vector_layer(self, datalayer_id: int):
        close_old_connections()
        try:
            process_datalayer(datalayer_id)
            datalayer = DataLayer.objects.only("status", "table").get(pk=datalayer_id)
            return {
                "status": datalayer.status,
                "table": datalayer.table,
            }
        finally:
            close_old_connections()
