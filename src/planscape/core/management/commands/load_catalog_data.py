import os
import subprocess
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.conf import settings

from datasets.models import DataLayer, DataLayerType, DataLayerStatus
from datasets.tasks import datalayer_uploaded

class Command(BaseCommand):
    help = "Loads catalog backup and trigger Vector layers post-upload tasks."

    def add_arguments(self, parser):
        parser.add_argument(
            "--file-name",
            default="latest_catalog_backup.json",
            help="Load data from specific file. Default: `latest_catalog_backup.json`"
        )


    def handle(self, **options):
        self.stdout.write("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n")
        self.stdout.write(f"!!   WARNING: you are running this command on {settings.ENV}.    !!\n")
        self.stdout.write("!! It will perform the following steps:                          !!\n")
        self.stdout.write("!! 1. Sync Catalog datalayers bucket with targeted env bucket;   !!\n")
        self.stdout.write("!! 2. Load data from given JSON file to targeted env database;   !!\n")
        self.stdout.write("!! 3. Update datalayers url to point to targeted env bucket;     !!\n")
        self.stdout.write("!! 4. Execute post-update process for Vector Layers (Ready only);!!\n")
        self.stdout.write("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n")

        confirmed = input("Confirm to proceed with process? (y,N)") or "n"

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

        backups_dir = os.path.join(settings.CATALOG_BACKUPS_PATH)
        if not os.path.exists(backups_dir):
            raise SystemError(
                "\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
                "!!     Error: Backups path is not configured.         !!\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
            )

        filename = options.get("file_name", "latest_catalog_backup.json")
        file_path = os.path.join(backups_dir, filename)
        if not os.path.exists(backups_dir):
            raise SystemError(
                "\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
                "!!          Error: Backup file not found.             !!\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
            )
        
        try:
            subprocess.call(
                [
                    "gcloud",
                    "storage", 
                    "rsync",
                    "gs://planscape-datastore-catalog/datalayers",
                    f"gs://planscape-datastore-{settings.ENV}/datalayers",
                    "--recursive"
                ]
            )
            
            call_command(
                "loaddata", 
                str(file_path),
            )

            self.stdout.write(self.style.SUCCESS(f"Successfully loaded data from {file_path}"))

            ready_vector_layers = DataLayer.objects.filter(type=DataLayerType.VECTOR, status=DataLayerStatus.READY)

            for vector_layer in ready_vector_layers.iterator():
                datalayer_uploaded.delay(vector_layer.pk)

            self.stdout.write(self.style.SUCCESS(f"Triggered post-upload process for {ready_vector_layers.count()} Datalayers type=VECTOR and status=READY."))
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Error loading data: {e}"))
