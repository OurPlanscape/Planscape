from django.db import migrations

from collaboration.models import Role

RUN_PERMISSIONS = ["run_climate_foresight", "remove_climate_foresight"]
VIEW_PERMISSIONS = ["view_climate_foresight"]
RUN_ROLES = [Role.OWNER, Role.COLLABORATOR]
VIEW_ROLES = [Role.OWNER, Role.COLLABORATOR, Role.VIEWER]


def forwards(apps, schema_editor):
    Permission = apps.get_model("collaboration", "Permissions")
    for role in RUN_ROLES:
        for perm in RUN_PERMISSIONS:
            Permission.objects.update_or_create(role=role, permission=perm)
    for role in VIEW_ROLES:
        for perm in VIEW_PERMISSIONS:
            Permission.objects.update_or_create(role=role, permission=perm)


def backwards(apps, schema_editor):
    Permission = apps.get_model("collaboration", "Permissions")
    permissions = RUN_PERMISSIONS + VIEW_PERMISSIONS
    Permission.objects.filter(permission__in=permissions).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("collaboration", "0007_auto_20251015_1733"),
    ]

    operations = [migrations.RunPython(forwards, backwards)]
