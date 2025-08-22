from django.db import migrations
from pathlib import Path


def load_sql(apps, schema_editor):
    sql_path = (
        Path(__file__).resolve().parent.parent
        / "sql"
        / "create_dynamic_stands_for_planning_area.sql"
    )
    sql = sql_path.read_text()
    with schema_editor.connection.cursor() as cur:
        cur.execute(sql)


class Migration(migrations.Migration):
    dependencies = [("stands", "0002_auto_20250725_1720")]
    operations = [migrations.RunPython(load_sql)]
