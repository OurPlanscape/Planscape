from django.db import migrations
from utils.file_utils import read_file

UP_MIGRATION = read_file("stands/sql/create_200ha_stands.sql")


class Migration(migrations.Migration):
    dependencies = [
        ("stands", "0002_auto_20230816_1812"),
    ]

    operations = [migrations.RunSQL(UP_MIGRATION)]
