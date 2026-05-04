from django.conf import settings
from django.db import migrations


def create_default_workspace(apps, schema_editor):
    Workspace = apps.get_model("workspaces", "Workspace")
    UserAccessWorkspace = apps.get_model("workspaces", "UserAccessWorkspace")
    Dataset = apps.get_model("datasets", "Dataset")
    DataLayer = apps.get_model("datasets", "DataLayer")
    Style = apps.get_model("datasets", "Style")
    Category = apps.get_model("datasets", "Category")
    User = apps.get_model("auth", "User")

    user = User.objects.filter(email=settings.DEFAULT_ADMIN_EMAIL).first()

    workspace = Workspace.objects.create(
        name="Default",
        visibility="PUBLIC",
    )

    if user:
        UserAccessWorkspace.objects.get_or_create(
            user=user,
            workspace=workspace,
            defaults={"role": "OWNER"},
        )

    Dataset.objects.all().update(workspace=workspace)
    DataLayer.objects.all().update(workspace=workspace)
    Style.objects.all().update(workspace=workspace)
    Category.objects.all().update(workspace=workspace)

    sig_gis_users = User.objects.filter(email__endswith="@sig-gis.com")
    if user:
        sig_gis_users = sig_gis_users.exclude(pk=user.pk)
    UserAccessWorkspace.objects.bulk_create(
        [
            UserAccessWorkspace(user=u, workspace=workspace, role="COLLABORATOR")
            for u in sig_gis_users
        ]
    )


def delete_default_workspace(apps, schema_editor):
    Workspace = apps.get_model("workspaces", "Workspace")
    Dataset = apps.get_model("datasets", "Dataset")
    DataLayer = apps.get_model("datasets", "DataLayer")
    Style = apps.get_model("datasets", "Style")
    Category = apps.get_model("datasets", "Category")

    try:
        workspace = Workspace.objects.get(name="Default", visibility="PUBLIC")
        Dataset.objects.filter(workspace=workspace).update(workspace=None)
        DataLayer.objects.filter(workspace=workspace).update(workspace=None)
        Style.objects.filter(workspace=workspace).update(workspace=None)
        Category.objects.filter(workspace=workspace).update(workspace=None)
        workspace.delete()
    except Workspace.DoesNotExist:
        pass


class Migration(migrations.Migration):
    dependencies = [
        ("workspaces", "0001_initial"),
        ("datasets", "0028_dataset_style_datalayer_workspace"),
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.RunPython(create_default_workspace, delete_default_workspace),
    ]
