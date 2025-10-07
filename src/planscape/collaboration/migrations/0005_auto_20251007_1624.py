from django.db import migrations

from collaboration.models import Role


DELETE_PLANNING_AREA_PERMISSION = "delete_planningarea"


def forwards(apps, schema_editor):
    Permission = apps.get_model("collaboration", "Permissions")
    Permission.objects.update_or_create(
        role=Role.OWNER, permission=DELETE_PLANNING_AREA_PERMISSION
    )


def backwards(apps, schema_editor):
    Permission = apps.get_model("collaboration", "Permissions")
    Permission.objects.filter(
        role=Role.OWNER, permissions=DELETE_PLANNING_AREA_PERMISSION
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("collaboration", "0004_change_permissions"),
    ]

    operations = [migrations.RunPython(forwards, backwards)]
