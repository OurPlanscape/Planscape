from datetime import datetime, timedelta
from itertools import repeat
import multiprocessing
import time
from django import db
from django.contrib.gis.geos import GEOSGeometry
from django.core.management.base import BaseCommand, CommandParser
import humanize
from conditions.models import Condition
from django.db import connection

from stands.models import Stand, StandMetric


def handle_stand_condition(stand_id, condition_id):
    # stand_id, condition_id = data#
    with connection.cursor() as cursor:
        try:
            cursor.execute(
                """
                INSERT INTO stands_standmetric (created_at, min, avg, max, sum, count, condition_id, stand_id) (
                    SELECT 
                        now(),
                        stats.min,
                        stats.avg,
                        stats.max,
                        stats.sum,
                        stats.count,
                        stats.condition_id,
                        stats.stand_id
                    FROM compute_stand_stats(%s, %s) AS stats
                    WHERE
                        stats.condition_id IS NOT NULL AND
                        stats.count > 0
                )""",
                [stand_id, condition_id],
            )
        except Exception as ex:
            print(f"[FAIL] {stand_id} {condition_id} {ex}")


class Command(BaseCommand):
    help = "Loads stand metrics based on conditions existing in the database."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--condition-ids",
            nargs="+",
            type=int,
        )

        parser.add_argument(
            "--size",
            type=str,
            default="MEDIUM",
        )

        parser.add_argument(
            "--clear",
            default=True,
            action="store_true",
            help="If set to false, the command will not remove previous metrics data from each condition from the raster table.",
        )

        parser.add_argument("--max-workers", type=int, default=4)

    def clear_data(self, condition_ids=None, size=None):
        filters = {}
        if condition_ids:
            filters["condition_id__in"] = condition_ids
        if size:
            filters["stand__size"] = size
        delete = StandMetric.objects.filter(**filters).delete()
        self.stdout.write(f"Deleted data {delete}")

    def get_condition_extent(self, condition_id):
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    ST_Envelope(ST_Collect(ST_Envelope(raster))) AS "geometry"
                FROM conditions_conditionraster cc 
                WHERE condition_id = %s""",
                [condition_id],
            )

            row = cursor.fetchone()
            geometry = row[0]
            if geometry:
                return GEOSGeometry(row[0])
            return None

    def get_stand_ids(self, condition_id=None, size=None):
        qs = Stand.objects.all()
        if size:
            qs = qs.filter(size=size)

        if condition_id:
            extent = self.get_condition_extent(condition_id)
            if not extent:
                self.stdout.write(
                    f"[WARN] Empty extent for condition {condition_id}. No metrics to load."
                )
                return Stand.objects.none()

            qs = qs.filter(geometry__intersects=extent)

        return qs.values_list("id", flat=True)

    def get_conditions_ids(self, condition_ids=None):
        qs = Condition.objects.all()
        if condition_ids:
            qs = qs.filter(id__in=condition_ids)
        return qs.values_list("id", flat=True)

    def handle(self, *args, **options):
        max_workers = options.get("max_workers")
        condition_ids = options.get("condition_ids")
        size = options.get("size")
        clear = options.get("clear")

        if clear:
            self.clear_data(condition_ids, size)

        condition_ids = self.get_conditions_ids(condition_ids)
        total_delta = timedelta()
        for condition_id in condition_ids:
            start_time = datetime.now()
            stand_ids = self.get_stand_ids(condition_id, size)
            if stand_ids.count() <= 0:
                self.stdout.write(
                    f"[OK] Finished {condition_id}: 0 seconds - no raster data."
                )
                continue
            self.stdout.write(
                f"[OK] Processing {condition_id} with {stand_ids.count()} stands."
            )
            db.connections.close_all()

            with multiprocessing.Pool(max_workers) as pool:
                pool.starmap(
                    handle_stand_condition,
                    zip(stand_ids, repeat(condition_id)),
                    chunksize=10000,
                )

            end_time = datetime.now()
            delta = end_time - start_time
            total_delta = total_delta + delta
            self.stdout.write(
                f"[OK] Finished {condition_id}: {humanize.precisedelta(delta)}"
            )

        self.stdout.write(
            f"[DONE] Finished loading {len(condition_ids)} conditions: {humanize.precisedelta(total_delta)}"
        )
