from django.db import migrations

DELETE_2025_STANDS = """
DELETE FROM
    stands_standmetric sm USING stands_stand ss
WHERE
    sm.stand_id = ss.id AND
    EXTRACT(YEAR FROM ss.created_at) >= 2025;
DELETE FROM stands_stand WHERE EXTRACT(YEAR FROM created_at) >= 2025;
"""


class Migration(migrations.Migration):
    dependencies = [
        ("stands", "0008_auto_20250901_1722"),
    ]

    operations = [migrations.RunSQL(DELETE_2025_STANDS)]
