from itertools import repeat
import multiprocessing
from django.core.management.base import BaseCommand
from django.contrib.gis.db.models.functions import Transform, AsWKT
from django.contrib.gis.geos import GEOSGeometry
from django.db import connection
from rasterstats import gen_zonal_stats, zonal_stats
from conditions.models import Condition
from conditions.registry import get_raster_path
from stands.models import Stand, StandMetric
from stands.stats import gen_zonal_stats_experiment
import time


def handle(stand, paths):
    start = time.time()
    stats1 = zonal_stats(
        vectors=[stand[1]],
        raster=paths,
        stats="min max mean count sum majority minority",
    )
    end = time.time()
    print(end - start)
    return stats1


class Command(BaseCommand):
    help = "Loads stand metrics based on conditions existing in the database."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--condition-ids",
            nargs="+",
            type=int,
        )

        parser.add_argument(
            "--size",
            type=str,
            default="LARGE",
        )

        parser.add_argument(
            "--clear",
            default=True,
            action="store_true",
            help="If set to false, the command will not remove previous metrics data from each condition from the raster table.",
        )

        parser.add_argument("--max-workers", type=int, default=4)

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

    def handle(self, *args, **options):
        max_workers = options.get("max_workers")
        condition_ids = options.get("condition_ids")
        size = options.get("size")
        clear = options.get("clear")
        condition1 = Condition.objects.get(pk=1221)
        condition2 = Condition.objects.get(pk=1249)

        path1 = get_raster_path(condition1)
        stand_ids = self.get_stand_ids(1221, size)
        real_start = time.time()
        stands = (
            Stand.objects.filter(size=size, id__in=stand_ids)
            .annotate(geom=AsWKT(Transform(srid=3857, expression="geometry")))
            .values_list("id", "geom")
            .iterator(chunk_size=100)
        )
        with multiprocessing.Pool(max_workers) as pool:
            pool.starmap(handle, zip(stands, repeat(path1)), chunksize=100)

        real_end = time.time()
        print("TOTAL RUNTIME", real_end - real_start)
