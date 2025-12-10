from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("stands", "0012_auto_20250910_1709"),
    ]

    operations = [
        migrations.AlterField(
            model_name="stand",
            name="grid_key",
            field=models.CharField(blank=True, db_index=True, max_length=64, null=True),
        ),
    ]
