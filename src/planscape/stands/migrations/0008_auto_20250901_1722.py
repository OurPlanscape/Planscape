from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("stands", "0007_auto_20250901_1639"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="standmetric",
            index=models.Index(
                name="standmetrics_majority_partial_index",
                fields=["datalayer", "stand"],
                condition=models.Q(majority=1),
            ),
        ),
    ]
