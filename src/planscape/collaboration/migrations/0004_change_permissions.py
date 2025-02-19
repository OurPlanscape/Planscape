from django.db import migrations

from collaboration.models import Role

COLLABORATOR_PERMISSIONS = ["run_tx"]


def forwards(apps, schema_editor):
    Permission = apps.get_model("collaboration", "Permissions")
    list(
        map(
            lambda x: Permission.objects.update_or_create(
                role=Role.COLLABORATOR, permission=x
            ),
            COLLABORATOR_PERMISSIONS,
        )
    )


def backwards(apps, schema_editor):
    Permission = apps.get_model("collaboration", "Permissions")
    map(
        lambda x: Permission.objects.filter(
            role=Role.COLLABORATOR, permissions=x
        ).delete(),
        COLLABORATOR_PERMISSIONS,
    )


class Migration(migrations.Migration):
    dependencies = [
        ("collaboration", "0003_auto_20240716_1720"),
    ]

    operations = [migrations.RunPython(forwards, backwards)]
