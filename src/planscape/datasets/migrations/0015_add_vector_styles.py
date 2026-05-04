from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0004_alter_organization_options"),
        ("auth", "0012_alter_user_first_name_max_length"),
        ("datasets", "0014_remove_category_deleted_at"),
    ]

    operations = [
        migrations.RunPython(migrations.RunPython.noop, migrations.RunPython.noop),
    ]
