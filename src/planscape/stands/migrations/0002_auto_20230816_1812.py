from django.db import migrations
from utils.file_utils import read_file

UP_MIGRATION = read_file("stands/sql/create_stands.sql")
DOWN_MIGRATION = "DROP FUNCTION create_stands;"


class Migration(migrations.Migration):
    dependencies = [
        ("stands", "0001_initial"),
    ]

    operations = [migrations.RunSQL(UP_MIGRATION, DOWN_MIGRATION)]
