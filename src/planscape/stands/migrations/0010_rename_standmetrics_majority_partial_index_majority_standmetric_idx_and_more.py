from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("stands", "0009_auto_20250902_1749"),
    ]

    operations = [
        migrations.RenameIndex(
            model_name="standmetric",
            new_name="majority_standmetric_idx",
            old_name="standmetrics_majority_partial_index",
        ),
        migrations.AddIndexConcurrently(
            model_name="stand",
            constraint=models.UniqueConstraint(
                fields=("size", "grid_key"), name="unique_stand_gridkey_size"
            ),
        ),
        migrations.AddConstraint(
            model_name="stand",
            constraint=models.UniqueConstraint(fields=["size", "grid_key"]),
        ),
    ]
