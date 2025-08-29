from django.db import migrations


def create_index_for_datalayer(datalayer, schema_editor):
    table_id = str(datalayer.pk).zfill(5)
    command = f"""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS 
            dl{table_id}_gist_idx ON {datalayer.table} 
        USING GIST (geometry);
    """.strip()
    schema_editor.execute(command)


def handle(apps, schema_editor):
    DataLayer = apps.get_model("datasets", "DataLayer")
    for datalayer in DataLayer.objects.filter(type="VECTOR"):
        if datalayer.table:
            create_index_for_datalayer(datalayer, schema_editor)


class Migration(migrations.Migration):
    atomic = False
    dependencies = [
        ("datasets", "0019_datalayer_outline"),
    ]

    operations = [migrations.RunPython(handle, migrations.RunPython.noop)]
