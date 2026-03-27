import os
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
        rsync_executed = options.get("rsync_executed")
        
        self.stdout.write("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n")
        self.stdout.write(f"!!   WARNING: you are running this command on {settings.ENV}.    !!\n")
        self.stdout.write("!!   It will load the backup data generated on Catalag env.      !!\n")
        self.stdout.write("!! Make sure to run RSYNC command before executing this command. !!\n")
        self.stdout.write("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n")

        rsync_executed = input("Do you confirm that RSYNC was already executed? (y,N)") or "n"

        if settings.ENV == "catalog":
            raise SystemExit(
                "\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
                "!! DANGER: This command cannot be runned in catalog.       !!\n"
                "!! It loads all dataset app data from catalog's json file. !!\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
            )
        
        if rsync_executed.lower() != "y":
            raise SystemExit(
                "\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
                "!!         ERROR: RSYNC execution not confirmed.            !!\n"
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
        
        try:
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
