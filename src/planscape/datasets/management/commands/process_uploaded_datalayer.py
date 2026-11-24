from django.core.management.base import BaseCommand, CommandError

from datasets.models import DataLayer, DataLayerStatus
from datasets.tasks import process_uploaded_datalayer


class Command(BaseCommand):
    help = (
        "Processes a workspace upload right away, without waiting for the GCS "
        "notification. Use --retry to reprocess a FAILED upload."
    )

    def add_arguments(self, parser):
        parser.add_argument("datalayer_id", type=int)
        parser.add_argument(
            "--retry",
            action="store_true",
            help="Move a FAILED upload back to PENDING before processing.",
        )

    def handle(self, *args, datalayer_id, retry, **options):
        datalayer = DataLayer.objects.filter(
            pk=datalayer_id, raw_url__isnull=False
        ).first()
        if datalayer is None:
            raise CommandError(f"Upload {datalayer_id} does not exist.")

        if retry and datalayer.status == DataLayerStatus.FAILED:
            datalayer.status = DataLayerStatus.PENDING
            datalayer.failure_reason = None
            datalayer.save(update_fields=["status", "failure_reason", "updated_at"])

        if datalayer.status != DataLayerStatus.PENDING:
            raise CommandError(
                f"Upload {datalayer_id} is {datalayer.status}, not PENDING."
            )

        process_uploaded_datalayer(datalayer_id)
        datalayer.refresh_from_db()
        self.stdout.write(f"Upload {datalayer_id} is {datalayer.status}.")
        if datalayer.failure_reason:
            self.stdout.write(f"Reason: {datalayer.failure_reason}")
