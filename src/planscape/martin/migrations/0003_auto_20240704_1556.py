from django.db import migrations

from utils.file_utils import read_file

UP_MIGRATION = read_file("martin/sql/martin_get_treatment_plan_prescriptions.sql")
DOWN_MIGRATION = "DROP FUNCTION IF EXISTS martin_get_treatment_plan_prescriptions;"


class Migration(migrations.Migration):
    dependencies = [
        ("martin", "0002_auto_20240703_1654"),
    ]

    operations = [
        migrations.RunSQL(UP_MIGRATION, DOWN_MIGRATION),
    ]
