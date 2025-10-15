from django.db import migrations

from collaboration.models import Role


PERMISSIONS_TO_BE_ADDED = [
    "change_planning_area"
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


def backwards(apps, schema_editor):
    Permission = apps.get_model("collaboration", "Permissions")
    list(
        map(
            lambda x: Permission.objects.filter(role=Role.OWNER, permission=x).delete(),
            PERMISSIONS_TO_BE_ADDED,
        )
    )


class Migration(migrations.Migration):
    dependencies = [
        ("collaboration", "0006_auto_20251008_2014"),
    ]

    operations = [migrations.RunPython(forwards, backwards)]
