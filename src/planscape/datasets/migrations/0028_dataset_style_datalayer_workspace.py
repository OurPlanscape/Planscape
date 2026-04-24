import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0026_dataset_modules"),
        ("datasets", "0027_category_workspace"),
    ]

    operations = [
        migrations.AddField(
            model_name="datalayer",
            name="workspace",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="datalayers",
                to="workspaces.workspace",
            ),
        ),
        migrations.AddField(
            model_name="dataset",
            name="workspace",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="datasets",
                to="workspaces.workspace",
            ),
        ),
        migrations.AddField(
            model_name="style",
            name="workspace",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="styles",
                to="workspaces.workspace",
            ),
        ),
    ]
