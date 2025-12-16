from typing import Iterable, Optional

from django.core.management.base import BaseCommand, CommandParser

from datasets.models import DataLayer, DataLayerStatus
from datasets.services import get_datalayer_outline


class Command(BaseCommand):
    help = "Computes and saves outlines for selected datalayers."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--id",
            dest="ids",
            type=int,
            nargs="+",
            help="Only process the provided datalayer ids.",
        )
        parser.add_argument(
            "--skip-existing",
            default=False,
            action="store_true",
            help="Skips existing outlines in datalayers.",
        )

    def handle(self, *args, **options):
        ids: Optional[Iterable[int]] = options.get("ids")
        skip_existing: bool = options["skip_existing"]
        queryset = DataLayer.objects.filter(status=DataLayerStatus.READY)
        if ids:
            queryset = queryset.filter(id__in=ids)

        queryset = queryset.order_by("id")
        total = queryset.count()
        if total == 0:
            self.stdout.write("No datalayers selected for outline computation.")
            return
        updated = skipped = failed = 0
        self.stdout.write(f"Processing {total} datalayers.")
        for index, datalayer in enumerate(queryset.iterator(), start=1):
            prefix = f"[{index}/{total}] datalayer {datalayer.id}"
            if skip_existing and datalayer.outline:
                skipped += 1
                self.stdout.write(f"{prefix} already has an outline, skipping.")
                continue
            try:
                datalayer.outline = get_datalayer_outline(datalayer)
                datalayer.save(update_fields=["outline", "updated_at"])
                updated += 1
                self.stdout.write(f"{prefix} outline updated.")
            except Exception as exc:
                failed += 1
                self.stderr.write(f"{prefix} failed: {exc}")
        self.stdout.write(
            f"Finished processing {total} datalayers. Updated {updated}, skipped {skipped}, failed {failed}."
        )
