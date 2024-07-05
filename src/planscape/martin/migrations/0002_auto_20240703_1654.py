from django.db import migrations

from utils.file_utils import read_file

UP1_MIGRATION = read_file("martin/sql/martin_get_treatment_plan_prescriptions.sql")
UP2_MIGRATION = read_file("martin/sql/martin_project_area_outline.sql")
DOWN1_MIGRATION = "DROP FUNCTION IF EXISTS martin_get_treatment_plan_prescriptions;"
DOWN2_MIGRATION = "DROP FUNCTION IF EXISTS martin_project_area_outline;"


class Migration(migrations.Migration):
    dependencies = [
        ("martin", "0001_initial"),
    ]

    operations = [
        migrations.RunSQL(UP1_MIGRATION, DOWN1_MIGRATION),
        migrations.RunSQL(UP2_MIGRATION, DOWN2_MIGRATION),
    ]
