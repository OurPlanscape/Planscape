import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Workspace",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, null=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "deleted_at",
                    models.DateTimeField(
                        help_text="Define if the entity has been deleted or not and when",
                        null=True,
                        verbose_name="Deleted at",
                    ),
                ),
                ("name", models.CharField(max_length=256)),
                (
                    "visibility",
                    models.CharField(
                        choices=[("PRIVATE", "Private"), ("PUBLIC", "Public")],
                        default="PRIVATE",
                        max_length=16,
                    ),
                ),
            ],
            options={
                "verbose_name": "Workspace",
                "verbose_name_plural": "Workspaces",
            },
        ),
        migrations.CreateModel(
            name="UserAccessWorkspace",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, null=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "role",
                    models.CharField(
                        choices=[
                            ("OWNER", "Owner"),
                            ("COLLABORATOR", "Collaborator"),
                            ("VIEWER", "Viewer"),
                        ],
                        default="VIEWER",
                        max_length=16,
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="workspace_access",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "workspace",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="user_access",
                        to="workspaces.workspace",
                    ),
                ),
            ],
            options={
                "verbose_name": "User Access Workspace",
                "verbose_name_plural": "User Access Workspaces",
                "constraints": [
                    models.UniqueConstraint(
                        fields=("user", "workspace"),
                        name="unique_user_workspace_access",
                    )
                ],
            },
        ),
    ]
