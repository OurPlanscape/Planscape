from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0004_alter_organization_options"),
        ("datasets", "0024_add_climate_foresight_styles"),
    ]

    operations = [
        migrations.RunPython(migrations.RunPython.noop, migrations.RunPython.noop),
    ]
