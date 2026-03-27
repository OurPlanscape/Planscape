import os
import shutil
from datetime import datetime
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = "Generates backup of catalog data, by pushing it into json file to be loaded in another env."
    def handle(self, **options):
        if settings.ENV != "catalog":
            raise SystemExit(
                "\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
                "!! DANGER: This command can only be runned in catalog.!!\n"
                "!! It dumps all dataset app data into a json file.    !!\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
            )
        

        backups_dir = os.path.join(settings.CATALOG_BACKUPS_PATH)
        if not os.path.exists(backups_dir):
            raise SystemError(
                "\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
                "!!     Error: Backups path is not configured.         !!\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
            )
        

        now = datetime.now()
        output_filename = f"{now.strftime('%Y-%m-%d_%H:%M:%S')}_catalog_backup.json"
        output_path = os.path.join(backups_dir, output_filename)
        
        try:
            call_command(
                "dumpdata", 
                "organizations.Organization",
                "dataset.Dataset",
                "dataset.Category",
                "dataset.Style",
                "dataset.DataLayer",
                "planning.TreatmentGoal",
                ">",
                str(output_path),
            )
            
            latest_output_file_name = "latest_catalog_backup.json"
            latest_output_path = os.path.join(backups_dir, latest_output_file_name)
            shutil.copy(str(output_path), str(latest_output_path))

        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Error dumping data: {e}"))
