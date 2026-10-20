import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0029_simplecategory_datalayer_simple_categories"),
        ("workspaces", "0004_workspace_invite_fields"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="WorkspaceFavoriteDataLayer",
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
                (
                    "created_by",
                    models.ForeignKey(
                        help_text="User that favorited the DataLayer.",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="favorited_datalayers",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "datalayer",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="workspace_favorites",
                        to="datasets.datalayer",
                    ),
                ),
                (
                    "workspace",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="favorite_datalayers",
                        to="workspaces.workspace",
                    ),
                ),
            ],
            options={
                "verbose_name": "Workspace Favorite DataLayer",
                "verbose_name_plural": "Workspace Favorite DataLayers",
                "constraints": [
                    models.UniqueConstraint(
                        fields=("workspace", "datalayer"),
                        name="unique_workspace_favorite_datalayer",
                    )
                ],
            },
        ),
    ]
