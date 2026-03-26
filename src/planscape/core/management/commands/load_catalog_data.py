import os
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.conf import settings

from datasets.models import DataLayer, DataLayerType, DataLayerStatus
from datasets.tasks import datalayer_uploaded

class Command(BaseCommand):
    help = "Dump Dataset catalog data into json file to be loaded in another env."


    def add_arguments(self, parser):
        parser.add_argument(
            "--rsync-executed",
            action="store_true",
            default=False,
            help="Flag to confirm that the Buckets syncronization was executed.",
        )
        parser.add_argument(
            "--file-name",
            default="latest_catalog_backup.json",
            help="Load data from specific file. Default: `latest_catalog_backup.json`"
        )


    def handle(self, **options):
        rsync_executed = options.get("rsync_executed")
        if settings.ENV == "catalog":
            raise SystemExit(
                "\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
                "!! DANGER: This command cannot be runned in catalog.       !!\n"
                "!! It loads all dataset app data from catalog's json file. !!\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
            )
        
        if not rsync_executed:
            raise SystemExit(
                "\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
                "!!         ERROR: RSYNC execution not confirmed.            !!\n"
                "!! Make sure to excute RSYNC and add flag --rsync-executed. !!\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
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
        
        #TODO: execut GCS rsync
        # gcloud storage rsync gs://planscape-datastore-catalog/datalayers gs://planscape-datastore-<env>/ --recursive

        try:
            call_command(
                "loaddata", 
                str(file_path),
            )
            
            self.stdout.write(self.style.SUCCESS(f"Successfully loaded data from {file_path}"))

            ready_vector_layers = DataLayer.objects.filter(type=DataLayerType.VECTOR, status=DataLayerStatus.READY)

            for vector_layer in ready_vector_layers.iterator():
                datalayer_uploaded.delay(vector_layer.pk)

        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Error loading data: {e}"))
