import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("workspaces", "0002_create_default_workspace"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="workspace",
            options={
                "ordering": ["-created_at"],
                "verbose_name": "Workspace",
                "verbose_name_plural": "Workspaces",
            },
        ),
        migrations.AddField(
            model_name="workspace",
            name="kind",
            field=models.CharField(
                choices=[("DATA", "Data Catalog"), ("PLANNING", "Planning")],
                default="DATA",
                help_text=(
                    "What this workspace groups: data catalog entries "
                    "or planning areas."
                ),
                max_length=16,
            ),
        ),
        migrations.AddField(
            model_name="workspace",
            name="created_by",
            field=models.ForeignKey(
                help_text="User that created the Workspace.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="created_workspaces",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name="workspace",
            name="creator_name",
            field=models.CharField(
                help_text=(
                    "Name of the user that created the Workspace, "
                    "at creation time."
                ),
                max_length=256,
                null=True,
            ),
        ),
        migrations.AddConstraint(
            model_name="workspace",
            constraint=models.UniqueConstraint(
                condition=models.Q(("deleted_at", None)),
                fields=("created_by", "name"),
                name="unique_workspace_name_per_creator",
            ),
        ),
    ]
