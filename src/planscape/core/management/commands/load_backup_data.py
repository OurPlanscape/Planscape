import os
import shutil
import subprocess

from datasets.models import DataLayer, DataLayerStatus, DataLayerType
from datasets.tasks import datalayer_uploaded
from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand
from planscape.check_celery import post_to_mattermost


class Command(BaseCommand):
    help = "Loads backup data and trigger Vector layers post-upload tasks."

    def add_arguments(self, parser):
        parser.add_argument(
            "--file-name",
            default="latest_catalog_backup.json",
            help="Load data from specific file. Default: `latest_catalog_backup.json`",
        )
        parser.add_argument(
            "--source-env",
            default="catalog",
            help="Source which data will be copied from.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Skip confirmation prompt.",
        )

    def handle(self, **options):
        source_env = options.get("source_env", "catalog")
        force = options.get("force", False)
        self.stdout.write(
            "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
        )
        self.stdout.write(
            f"!!   WARNING: you are running this command on {settings.ENV}.    !!\n"
        )
        self.stdout.write(
            f"!!          and it will import data from {source_env}.           !!\n"
        )
        self.stdout.write(
            "!! It will perform the following steps:                          !!\n"
        )
        self.stdout.write(
            "!! 1. Sync source env datalayers bucket with targeted env bucket;!!\n"
        )
        self.stdout.write(
            "!! 2. Load data from given JSON file to targeted env database;   !!\n"
        )
        self.stdout.write(
            "!! 3. Update datalayers url to point to targeted env bucket;     !!\n"
        )
        self.stdout.write(
            "!! 4. Execute post-update process for Vector Layers (Ready only);!!\n"
        )
        self.stdout.write(
            "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
        )

        confirmed = (
            "y" if force else input("Confirm to proceed with process? (y,N)") or "n"
        )

        if confirmed.lower() != "y":
            raise SystemExit(
                "\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
                "!!                    Operation canceled                   !!\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
            )

        if settings.ENV == "catalog":
            raise SystemExit(
                "\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
                "!! DANGER: This command cannot be runned in catalog.       !!\n"
                "!! It loads all dataset app data from catalog's json file. !!\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
            )

        backups_dir = os.path.join(settings.BACKUPS_PATH)
        if not os.path.exists(backups_dir):
            raise SystemError(
                "\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
                "!!     Error: Backups path is not configured.         !!\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
            )

        filename = options.get("file_name", "latest_catalog_backup.json")
        file_path = os.path.join(backups_dir, filename)
        if not os.path.exists(file_path):
            raise SystemError(
                "\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
                "!!          Error: Backup file not found.             !!\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
            )

        if source_env not in filename:
            raise SystemError(
                "\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
                "!!  Error: Backup file and source env does not match. !!\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
            )

        try:
            # Sync buckets
            subprocess.call(
                [
                    "gcloud",
                    "storage",
                    "rsync",
                    f"--account={settings.STORAGE_SERVICE_ACCOUNT}",
                    f"gs://planscape-datastore-{source_env}/datalayers",
                    f"gs://planscape-datastore-{settings.ENV}/datalayers",
                    "--recursive",
                ]
            )

            # Copy to tmp folder and rename all `url` fields
            self.stdout.write(f"Copying file from {file_path} to /tmp/{filename}.")
            shutil.copy(file_path, f"/tmp/{filename}")

            self.stdout.write(
                f"Replacing  `planscape-datastore-{source_env}` with `planscape-datastore-{settings.ENV}` on /tmp/{filename}."
            )
            subprocess.call(
                [
                    "sed",
                    "-i",
                    f"s/planscape-datastore-{source_env}/planscape-datastore-{settings.ENV}/g",
                    f"/tmp/{filename}",
                ]
            )

            # Load data to DB
            self.stdout.write(f"Loading data from `/tmp/{filename}`")
            call_command(
                "loaddata",
                f"/tmp/{filename}",
            )

            self.stdout.write(
                self.style.SUCCESS(f"Successfully loaded data from `/tmp/{filename}`")
            )

            ready_vector_layers = DataLayer.objects.filter(
                type=DataLayerType.VECTOR, status=DataLayerStatus.READY
            )

            for vector_layer in ready_vector_layers.iterator():
                datalayer_uploaded.delay(vector_layer.pk)

            self.stdout.write(
                self.style.SUCCESS(
                    f"Triggered post-upload process for {ready_vector_layers.count()} Datalayers type=VECTOR and status=READY."
                )
            )
            post_to_mattermost(f"Catalog data restored successfully on {settings.ENV}.")
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Error loading data: {e}"))
            self.stderr.write(self.style.ERROR(f"Error loading data: {e}"))
            post_to_mattermost(f"Catalog data restore failed on {settings.ENV}: {e}")
