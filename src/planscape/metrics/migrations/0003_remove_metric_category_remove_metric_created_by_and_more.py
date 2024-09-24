from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("goals", "0004_remove_treatmentgoal_created_by_and_more"),
        ("metrics", "0002_metric_created_at_metric_deleted_at_and_more"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="metric",
            name="category",
        ),
        migrations.RemoveField(
            model_name="metric",
            name="created_by",
        ),
        migrations.RemoveField(
            model_name="metric",
            name="dataset",
        ),
        migrations.RemoveField(
            model_name="metric",
            name="project",
        ),
        migrations.DeleteModel(
            name="Category",
        ),
        migrations.DeleteModel(
            name="Metric",
        ),
    ]
