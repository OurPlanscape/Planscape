from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("metrics", "0003_remove_metric_category_remove_metric_created_by_and_more"),
        ("datasets", "0003_delete_dataset"),
        ("projects", "0004_delete_project"),
        ("organizations", "0003_alter_organization_created_by"),
    ]

    operations = [
        migrations.DeleteModel(
            name="Organization",
        ),
    ]
