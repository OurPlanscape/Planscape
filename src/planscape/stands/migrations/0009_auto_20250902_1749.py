from django.contrib.gis.db.models.functions import Centroid, GeoHash, Transform
from django.db import migrations
from django.db.models import F

DROP_INDEX = """
DROP INDEX CONCURRENTLY IF EXISTS
stands_stand_grid_key_index;
"""

BATCH_SIZE = 50_000
GEOHASH_PRECISION = 8
GEOM_FIELD = "geometry"
TARGET_SRID = 4326


def forwards(apps, schema_editor):
    Stand = apps.get_model("stands", "Stand")
    base_qs = Stand.objects.all()
    geohash_expr = GeoHash(
        Centroid(Transform(F(GEOM_FIELD), TARGET_SRID)),
        precision=GEOHASH_PRECISION,
    )
    last_pk = 0
    total = 0
    while True:
        batch_pks = list(
            base_qs.filter(pk__gt=last_pk)
            .order_by("pk")
            .values_list("pk", flat=True)[:BATCH_SIZE]
        )
        if not batch_pks:
            break

        Stand.objects.filter(pk__in=batch_pks).update(
            **{"grid_key": geohash_expr},
        )

        total += len(batch_pks)
        last_pk = batch_pks[-1]
        print(f"[grid_key] updated so far: {total}")

    print(f"[grid_key] done. total updated: {total}")


class Migration(migrations.Migration):
    atomic = False
    dependencies = [
        ("stands", "0008_auto_20250901_1722"),
    ]

    operations = [
        migrations.RunSQL(DROP_INDEX),
        migrations.RunPython(forwards),
    ]
