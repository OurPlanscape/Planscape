from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("metrics", "0003_remove_metric_category_remove_metric_created_by_and_more"),
        ("goals", "0004_remove_treatmentgoal_created_by_and_more"),
        ("projects", "0003_alter_project_created_by_alter_project_organization"),
    ]

    operations = [
        migrations.DeleteModel(
            name="Project",
        ),
    ]
