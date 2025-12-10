from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        (
            "stands",
            "0010_rename_standmetrics_majority_partial_index_majority_standmetric_idx_and_more",
        ),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="stand",
            name="unique_stand_gridkey_size_cst",
        ),
        migrations.RemoveIndex(
            model_name="stand",
            name="unique_stand_gridkey_size_idx",
        ),
        migrations.AddConstraint(
            model_name="stand",
            constraint=models.UniqueConstraint(
                fields=("size", "grid_key"), name="unique_stand_gridkey_size"
            ),
        ),
    ]
