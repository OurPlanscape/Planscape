from django.db import migrations
from utils.file_utils import read_file

UP_MIGRATION_CREATE_COMPUTE_STAND_STATS = read_file(
    "stands/sql/create_compute_stand_stats.sql"
)

UP_MIGRATION_CREATE_GENERATE_STAND_METRICS = read_file(
    "stands/sql/create_generate_stand_metrics.sql"
)


class Migration(migrations.Migration):
    dependencies = [
        ("stands", "0004_auto_20230821_1342"),
    ]

    operations = [
        migrations.RunSQL(UP_MIGRATION_CREATE_COMPUTE_STAND_STATS),
        migrations.RunSQL(UP_MIGRATION_CREATE_GENERATE_STAND_METRICS),
    ]
