# src/planscape/stands/migrations/0004_grid_key_unique_index.py

from django.db import migrations


class Migration(migrations.Migration):
    atomic = False

    dependencies = [("stands", "0003_stand_grid_key")]

    operations = [
        migrations.RunSQL(
            sql="""
                CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS
                stands_stand_grid_key_index
                ON public.stands_stand(grid_key);
            """,
            reverse_sql="""
                DROP INDEX CONCURRENTLY IF EXISTS
                stands_stand_grid_key_index;
            """,
        ),
    ]
