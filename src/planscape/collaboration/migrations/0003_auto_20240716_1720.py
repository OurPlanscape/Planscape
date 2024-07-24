from django.db import migrations

from collaboration.models import Role


VIEWER_PERMISSIONS = [
    "view_tx_plan",
]
COLLABORATOR_PERMISSIONS = VIEWER_PERMISSIONS + [
    "add_tx_plan",
    "clone_tx_plan",
    "edit_tx_plan",
    "remove_tx_plan",
    "add_tx_prescription",
    "remove_tx_prescription",
]
OWNER_PERMISSIONS = COLLABORATOR_PERMISSIONS + [
    "run_tx",
]


def forwards(apps, schema_editor):
    Permission = apps.get_model("collaboration", "Permissions")
    list(
        map(
            lambda x: Permission.objects.update_or_create(
                role=Role.VIEWER, permission=x
            ),
            VIEWER_PERMISSIONS,
        )
    )
    list(
        map(
            lambda x: Permission.objects.update_or_create(
                role=Role.COLLABORATOR, permission=x
            ),
            COLLABORATOR_PERMISSIONS,
        )
    )
    list(
        map(
            lambda x: Permission.objects.update_or_create(
                role=Role.OWNER, permission=x
            ),
            OWNER_PERMISSIONS,
        )
    )


def backwards(apps, schema_editor):
    Permission = apps.get_model("collaboration", "Permissions")
    map(
        lambda x: Permission.objects.filter(role=Role.VIEWER, permission=x).delete(),
        VIEWER_PERMISSIONS,
    )
    map(
        lambda x: Permission.objects.filter(
            role=Role.COLLABORATOR, permissions=x
        ).delete(),
        COLLABORATOR_PERMISSIONS,
    )
    map(
        lambda x: Permission.objects.filter(role=Role.OWNER, permissions=x).delete(),
        OWNER_PERMISSIONS,
    )


class Migration(migrations.Migration):
    dependencies = [
        ("collaboration", "0002_add_permissions"),
    ]

    operations = [migrations.RunPython(forwards, backwards)]
