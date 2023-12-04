import json
import multiprocessing
import time
from itertools import repeat

import rasterio
from conditions.models import Condition
from conditions.registry import get_raster_path
from django.contrib.gis.db.models.functions import AsWKT, Transform
from django.contrib.gis.geos import GEOSGeometry
from django.core.management.base import BaseCommand
from django.db import connection
from rasterstats import zonal_stats
from stands.stats import gen_zonal_stats_experiment
from stands.models import Stand
from django.conf import settings


def inner(stand, condition_id, raster_path):
    stand_id, geometry = stand
    stats = zonal_stats(
        vectors=[geometry],
        raster=raster_path,
        stats="min max mean count sum majority minority",
    )[0]
    min = stats.get("min")
    max = stats.get("max")
    avg = stats.get("mean")
    count = stats.get("count")
    sum = stats.get("sum")
    maj = stats.get("majority")
    mnt = stats.get("minority")
    if count <= 0:
        return None
    return f"{stand_id},{condition_id},{min},{max},{avg},{sum},{count},{maj},{mnt}\n"


def inner2(stand, condition_id, raster_path, stand_cache):
    stand_id, geometry = stand
    stats = gen_zonal_stats_experiment(
        stand_id,
        stand_geometry=geometry,
        stand_cache=stand_cache,
        raster=raster_path,
        stats="min max mean count sum majority minority",
    )[0]
    min = stats.get("min")
    max = stats.get("max")
    avg = stats.get("mean")
    count = stats.get("count", 0)
    sum = stats.get("sum")
    maj = stats.get("majority")
    mnt = stats.get("minority")
    if count <= 0:
        return None
    return f"{stand_id},{condition_id},{min},{max},{avg},{sum},{count},{maj},{mnt}\n"


class Command(BaseCommand):
    help = "Calculates stand metrics based on conditions existing in the database and creates a file to be copied."

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
            "--outfile",
            type=str,
        )

        parser.add_argument("--discover", type=str, default=None)

        parser.add_argument("--max-workers", type=int, default=4)

        parser.add_argument("--force-yes", action="store_true")

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

    def get_stands_queryset(self, condition_id=None, size=None):
        queryset = Stand.objects.all()

        if size:
            queryset = queryset.filter(size=size)

        if condition_id:
            extent = self.get_condition_extent(condition_id)
            if not extent:
                self.stdout.write(
                    f"[WARN] Empty extent for condition {condition_id}. No metrics to load."
                )
                return Stand.objects.none()

            queryset = queryset.filter(geometry__intersects=extent)

        return queryset.annotate(
            geom=AsWKT(Transform(srid=3857, expression="geometry"))
        )

    def get_conditions(self, condition_ids=None, discover_region=None):
        if not discover_region:
            qs = Condition.objects.all().select_related("condition_dataset")
            if condition_ids:
                qs = qs.filter(id__in=condition_ids)
            return qs
        else:
            return self.discover(discover_region)

    def get_treatment_goals(self, region):
        with open(settings.DEFAULT_TREATMENTS_FILE) as f:
            goals = json.load(f)

            for i in goals.get("regions"):
                if i.get("region_name") == region:
                    return i

    def discover(self, region, force_yes=False):
        conditions = list()
        treatment_goals = self.get_treatment_goals(region)

        for questions in treatment_goals.get("treatment_goals", []):
            for question in questions.get("questions", []):
                output_fields = question.get("scenario_output_fields_paths", {})
                conditions.extend(output_fields.get("metrics", []))

        # removes duplicates
        condition_names = list(set(conditions))
        print("Conditions:\n")
        for c in condition_names:
            print(f"{c}")

        print(f"Conditions found: {len(condition_names)}")

        value = "y" if force_yes else input("Do you wish to proceed? [Y/n]").lower()

        if value == "y":
            return Condition.objects.filter(
                condition_dataset__region_name=region,
                condition_dataset__condition_name__in=condition_names,
            )

        return []

    def handle(self, *args, **options):
        with rasterio.Env(GDAL_CACHE_MAX=16000, GDAL_NUM_THREADS="ALL_CPUS"):
            max_workers = options.get("max_workers")
            condition_ids = options.get("condition_ids")
            discover_region = options.get("discover")
            size = options.get("size")
            conditions = self.get_conditions(condition_ids, discover_region)
            cached = options.get("cached", True)

            real_start = time.time()

            stand_cache = dict()

            for condition in conditions:
                start_condition = time.time()
                stands = self.get_stands_queryset(condition_id=condition.id, size=size)
                condition_id = condition.pk
                region = condition.condition_dataset.region_name
                if stands.count() <= 0:
                    self.stdout.write(
                        f"[OK] Finished {condition_id}: 0 seconds - no raster data."
                    )
                    continue
                self.stdout.write(
                    f"[OK] Processing {condition_id} with {stands.count()} stands."
                )
                stand_data = stands.values_list("id", "geom").iterator(chunk_size=1000)
                raster_path = get_raster_path(condition)

                if not raster_path.exists():
                    self.stdout.write("[FAIL] Raster does not exists in disk")
                    continue

                outfile = f"{region}_{condition_id}_{size}.csv"

                with multiprocessing.Manager() as manager:
                    stand_cache = manager.dict()

                    with multiprocessing.Pool(max_workers) as pool:
                        data = zip(
                            stand_data,
                            repeat(condition_id),
                            repeat(raster_path),
                            repeat(stand_cache),
                        )
                        for result in pool.starmap(inner2, data, chunksize=1000):
                            print(result)

                    # with multiprocessing.Pool(max_workers) as pool:
                    #     data = zip(
                    #         stand_data,
                    #         repeat(stand_cache),
                    #         repeat(condition_id),
                    #         repeat(raster_path),
                    #     )
                    #     for result in pool.starmap(compute_from_array, data):
                    #         print(result)

                # with open(outfile, "w") as out:
                #     out.write(
                #         "stand_id,condition_id,min,max,avg,sum,count,majority,minority"
                #     )

                #     with multiprocessing.Pool(max_workers) as pool:
                #         data = zip(
                #             stand_data,
                #             repeat(condition_id),
                #             repeat(raster_path),
                #         )
                #         for result in pool.starmap(inner, data, chunksize=500):
                #             if result:
                #                 out.write(result)

                end_condition = time.time()
                self.stdout.write(
                    f"CONDITION RUNTIME {condition_id} {end_condition - start_condition}"
                )
            real_end = time.time()
            self.stdout.write(f"TOTAL RUNTIME {real_end - real_start}")
