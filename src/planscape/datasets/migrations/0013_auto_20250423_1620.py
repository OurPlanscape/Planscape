from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0012_auto_20250418_1307"),
        ("organizations", "0004_alter_organization_options"),
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.RunPython(migrations.RunPython.noop, migrations.RunPython.noop),
    ]
