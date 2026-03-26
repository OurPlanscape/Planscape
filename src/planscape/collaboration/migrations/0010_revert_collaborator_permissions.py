from django.db import migrations

from collaboration.models import Role

PERMISSIONS = [
    "change_planning_area",
    "view_collaborator",
]


def forwards(apps, schema_editor):
    Permission = apps.get_model("collaboration", "Permissions")
    Permission.objects.filter(
        role=Role.COLLABORATOR, permission__in=PERMISSIONS
    ).delete()


def backwards(apps, schema_editor):
    Permission = apps.get_model("collaboration", "Permissions")
    for perm in PERMISSIONS:
        Permission.objects.update_or_create(role=Role.COLLABORATOR, permission=perm)


class Migration(migrations.Migration):
    dependencies = [
        ("collaboration", "0009_auto_20260324_collaborator_permissions"),
    ]

    operations = [migrations.RunPython(forwards, backwards)]
