import os
import subprocess

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from core.catalog_import import CatalogImporter
from core.mattermost import post_to_mattermost
from core.models import RestoreBackTrack, RestoreBackTrackStatus
from datasets.tasks import datalayer_uploaded


class Command(BaseCommand):
    help = "Merges a catalog backup by scoped names and rebuilds imported vectors as needed."

    def add_arguments(self, parser):
        parser.add_argument(
            "--file-name",
            default="latest_production_backup.json",
            help="Load data from specific file. Default: `latest_production_backup.json`",
        )
        parser.add_argument(
            "--source-env",
            default="production",
            help="Source which data will be copied from.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Skip confirmation prompt.",
        )
        parser.add_argument(
            "--batch-size",
            default=500,
            help="Deprecated compatibility option; catalog imports no longer delete records.",
            type=int,
        )

    def handle(self, **options):
        source_env = options.get("source_env", "production")
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
            "!! 2. Merge catalog by scoped names; preserve local records;     !!\n"
        )
        self.stdout.write(
            "!! 3. Update datalayers url to point to targeted env bucket;     !!\n"
        )
        self.stdout.write(
            "!! 4. Rebuild imported ready vectors when necessary;             !!\n"
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

        if settings.ENV == "production":
            raise SystemExit(
                "\n"
                "!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n"
                "!! DANGER: This command cannot be runned in production.       !!\n"
                "!! It loads all dataset app data from production's json file. !!\n"
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

        filename = options.get("file_name", "latest_production_backup.json")
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

        now = timezone.now()
        current_run = RestoreBackTrack.objects.create(
            started_at=now, file_name=filename
        )
        try:
            importer = CatalogImporter.from_file(file_path, source_env, settings.ENV)
            # Sync buckets
            subprocess.run(
                [
                    "gcloud",
                    "storage",
                    "rsync",
                    f"--account={settings.STORAGE_SERVICE_ACCOUNT}",
                    f"gs://planscape-datastore-{source_env}/datalayers",
                    f"gs://planscape-datastore-{settings.ENV}/datalayers",
                    "--recursive",
                ],
                check=True,
            )

            importer.merge()
            for label, counts in importer.counts.items():
                self.stdout.write(
                    f"{label}: {counts['created']} created, {counts['updated']} updated, "
                    f"{counts['unchanged']} unchanged, {counts['skipped']} skipped."
                )
            for layer_id in importer.vector_ids:
                transaction.on_commit(lambda pk=layer_id: datalayer_uploaded.delay(pk))
            self.stdout.write(
                self.style.SUCCESS(
                    f"Merged catalog data from {file_path}; scheduled "
                    f"{len(importer.vector_ids)} vector layers for processing."
                )
            )
            post_to_mattermost(
                f"planscape-{settings.ENV} :white_check_mark: Catalog data restore completed successfully"
            )
            current_run.finished_at = timezone.now()
            current_run.status = RestoreBackTrackStatus.SUCCESS
            current_run.save()
        except Exception as e:
            self.stderr.write(self.style.ERROR(f"Error loading data: {e}"))
            current_run.finished_at = timezone.now()
            current_run.status = RestoreBackTrackStatus.FAILED
            current_run.save()
            post_to_mattermost(
                f"planscape-{settings.ENV} :x: Catalog data restore failed: {e}"
            )
            raise
