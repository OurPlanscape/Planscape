from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0013_auto_20250423_1620"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="category",
            name="deleted_at",
        ),
    ]
