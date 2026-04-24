from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0016_add_map_service_type"),
    ]

    operations = [
        migrations.RunPython(migrations.RunPython.noop, migrations.RunPython.noop),
    ]
