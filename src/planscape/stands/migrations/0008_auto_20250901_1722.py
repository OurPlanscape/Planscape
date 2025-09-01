from django.contrib.postgres.operations import AddIndexConcurrently
from django.db import migrations, models


class Migration(migrations.Migration):
    atomic = False
    dependencies = [
        ("stands", "0007_auto_20250901_1639"),
    ]

    operations = [
        AddIndexConcurrently(
            model_name="standmetric",
            index=models.Index(
                name="standmetrics_majority_partial_index",
                fields=["datalayer", "stand"],
                condition=models.Q(majority=1),
            ),
        ),
    ]
