import io
import os
from datetime import datetime
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = "Dump Dataset catalog data into json file to be loaded in another env."
    def handle(self, **options):
        if settings.ENV != "catalog":
            raise SystemExit(
                "\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
                "!! DANGER: This command can only be runned in catalog.!!\n"
                "!! It dumps all dataset app data into a json file.    !!\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
            )
        

        dumps_dir = os.path.join(settings.CATALOG_DUMPS_PATH)
        if not os.path.exists(dumps_dir):
            raise SystemError(
                "\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
                "!!      Error: Dumps path is not configured.          !!\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
            )
        

        now = datetime.now()
        output_filenames = [f"{now.strftime('%Y-%m-%d_%H:%M:%S')}_catalog_dump.json", "latest_catalog_dump.json"]
        
        buf = io.StringIO()
        try:
            call_command(
                "dumpdata", 
                "organizations.Organization",
                "dataset.Dataset",
                "dataset.Category",
                "dataset.Style",
                "dataset.DataLayer",
                "planning.TreatmentGoal",
                format='json', 
                indent=2, 
                stdout=buf,
            )
            
            # Read from the buffer and write to the file
            for output_filename in output_filenames:
                output_path = os.path.join(dumps_dir, output_filename)
                buf.seek(0)
                with open(output_path, "w") as f:
                    f.write(buf.read())
                
                self.stdout.write(self.style.SUCCESS(f"Successfully dumped data to {output_path}"))

        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Error dumping data: {e}"))
