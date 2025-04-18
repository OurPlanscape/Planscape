from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0011_datalayer_hash_datalayer_storage_type_and_more"),
    ]

    operations = [
        migrations.RunSQL(
            "CREATE SCHEMA IF NOT EXISTS datastore;",
            "DROP SCHEMA IF EXISTS datastore;",
        )
    ]
