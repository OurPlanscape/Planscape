from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("metrics", "0003_remove_metric_category_remove_metric_created_by_and_more"),
        ("datasets", "0002_alter_dataset_geometry"),
    ]

    operations = [
        migrations.DeleteModel(
            name="Dataset",
        ),
    ]
