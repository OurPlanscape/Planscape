from django.db import migrations

DELETE_SQL = "DELETE FROM stands_standmetric WHERE datalayer_id IS NULL;"
NOOP = "SELECT * FROM VERSION();"


class Migration(migrations.Migration):
    dependencies = [
        ("stands", "0001_squash_0011"),
    ]

    operations = [migrations.RunSQL(DELETE_SQL, NOOP)]
