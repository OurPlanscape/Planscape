import io
import os
from datetime import datetime
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = "Dump Dataset catalog data into json file to be loaded in another env."


    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Print counts of records that would be deleted/updated without applying changes.",
        )
        parser.add_argument(
            "--file-name",
            default="latest_catalog_dump.json",
            help="Load data from specific file. Default: `latest_catalog_dump.json`"
        )


    def handle(self, **options):
        if settings.ENV == "catalog":
            raise SystemExit(
                "\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
                "!! DANGER: This command cannot be runned in catalog.       !!\n"
                "!! It loads all dataset app data from catalog's json file. !!\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
            )
        

        dumps_dir = os.path.join(settings.CATALOG_DUMPS_PATH)
        if not os.path.exists(dumps_dir):
            raise SystemError(
                "\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
                "!!      Error: Dumps path is not configured.          !!\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
            )
        

        filename = options.get("file_name", "latest_catalog_dump.json")
        file_path = os.path.join(dumps_dir, filename)
        if not os.path.exists(dumps_dir):
            raise SystemError(
                "\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
                "!!          Error: Dumps file not found.              !!\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
            )
        
        #TODO: execut GCS rsync

        try:
            call_command(
                "loaddata", 
                str(file_path),
            )
            
            self.stdout.write(self.style.SUCCESS(f"Successfully loaded data from {file_path}"))

        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Error loading data: {e}"))
