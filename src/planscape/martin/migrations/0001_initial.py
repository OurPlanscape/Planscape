from django.db import migrations

from utils.file_utils import read_file

UP_MIGRATION = read_file("martin/sql/martin_get_treatment_plan_prescriptions.sql")
DOWN_MIGRATION = "DROP FUNCTION martin_get_treatment_plan_prescriptions;"


class Migration(migrations.Migration):
    dependencies = []

    operations = [migrations.RunSQL(UP_MIGRATION, DOWN_MIGRATION)]
