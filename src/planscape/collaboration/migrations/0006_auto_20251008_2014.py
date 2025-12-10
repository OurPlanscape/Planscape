from django.db import migrations

from collaboration.models import Role


PERMISSIONS_TO_BE_REMOVED = [
    "delete_planningarea"
]
PERMISSIONS_TO_BE_ADDED = [
    "remove_scenario"
]


def forwards(apps, schema_editor):
    Permission = apps.get_model("collaboration", "Permissions")
    list(
        map(
            lambda x: Permission.objects.update_or_create(
                role=Role.OWNER, permission=x
            ),
            PERMISSIONS_TO_BE_ADDED,
        )
    )
    list(
        map(
            lambda x: Permission.objects.filter(role=Role.OWNER, permission=x).delete(),
            PERMISSIONS_TO_BE_REMOVED,
        )
    )


def backwards(apps, schema_editor):
    Permission = apps.get_model("collaboration", "Permissions")
    list(
        map(
            lambda x: Permission.objects.update_or_create(
                role=Role.OWNER, permission=x
            ),
            PERMISSIONS_TO_BE_REMOVED,
        )
    )
    list(
        map(
            lambda x: Permission.objects.filter(role=Role.OWNER, permission=x).delete(),
            PERMISSIONS_TO_BE_ADDED,
        )
    )


class Migration(migrations.Migration):
    dependencies = [
        ("collaboration", "0005_auto_20251007_1624"),
    ]

    operations = [migrations.RunPython(forwards, backwards)]
