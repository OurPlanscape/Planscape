from django.conf import settings
from django.core.management.base import BaseCommand, CommandParser


class Command(BaseCommand):
    help = "Transform S3 URLs to Google Cloud Storage (GCS) URLs in dataset files."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--dry-run",
            action="store_true",
            default=False,
            help="If set, show the number of DataLayers that would be updated.",
        )

    def handle(self, *args, **options):
        from planscape.datasets.models import DataLayer

        dry_run = options["dry_run"]
        count = 0

        qs = DataLayer.objects.filter(url__startswith="s3://")
        count = qs.count()
        if dry_run:
            self.stdout.write(f"{count} DataLayers would be updated.")
            return

        s3_prefix = f"s3://{settings.S3_BUCKET}/"
        gs_prefix = f"gs://{settings.GCS_BUCKET}/"

        for layer in qs.iterator():
            if layer.url.startswith(s3_prefix):
                new_url = layer.url.replace(s3_prefix, gs_prefix)
                layer.url = new_url
                layer.save()

            self.stdout.write(f"{count} DataLayers updated successfully.")
