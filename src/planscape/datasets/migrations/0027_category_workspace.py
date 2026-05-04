import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0012_auto_20250418_1307"),
        ("workspaces", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="category",
            name="workspace",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="categories",
                to="workspaces.workspace",
            ),
        ),
    ]
