from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand
from datetime import datetime
import os
import shutil


class Command(BaseCommand):
    help = "Generates backup data by pushing it into json file to be loaded in another env."

    def handle(self, **options):
        self.stdout.write(
            "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
        )
        self.stdout.write(
            f"!!   WARNING: you are running this command on {settings.ENV}.    !!\n"
        )
        self.stdout.write(
            "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
        )

        backups_dir = os.path.join(settings.BACKUPS_PATH)
        if not os.path.exists(backups_dir):
            raise SystemError(
                "\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
                "!!     Error: Backups path is not configured.         !!\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
            )

        now = datetime.now()
        output_filename = f"{now.strftime('%Y%m%d_%H%M%S')}_{settings.ENV}_backup.json"
        output_path = os.path.join(backups_dir, output_filename)

        try:
            with open(output_path, "w", encoding="utf-8") as output_file:
                call_command(
                    "dumpdata",
                    "organizations.Organization",
                    "datasets.Dataset",
                    "datasets.Category",
                    "datasets.Style",
                    "datasets.DataLayer",
                    "planning.TreatmentGoal",
                    "--indent",
                    "4",
                    stdout=output_file,
                )

            latest_output_file_name = f"latest_{settings.ENV}_backup.json"
            latest_output_path = os.path.join(backups_dir, latest_output_file_name)
            shutil.copy(str(output_path), str(latest_output_path))
            post_to_mattermost(
                f"planscape-{settings.ENV} :white_check_mark: Catalog data backup completed successfully: {output_filename}"
            )

        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Error dumping data: {e}"))
            post_to_mattermost(
                f"planscape-{settings.ENV} :x: Catalog data backup failed: {e}"
            )
