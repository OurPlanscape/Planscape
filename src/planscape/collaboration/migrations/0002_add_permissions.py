from django.db import migrations

from collaboration.models import Role


# Add the initial data to define each role and corresponding permissions
class Migration(migrations.Migration):
    dependencies = [
        ("collaboration", "0001_initial"),
    ]

    def insertData(apps, schema_editor):
        viewer = ["view_planningarea", "view_scenario"]
        collaborator = viewer + ["add_scenario", "change_scenario"]
        owner = collaborator + [
            "view_collaborator",
            "add_collaborator",
            "delete_collaborator",
            "change_collaborator",
        ]
        Permission = apps.get_model("collaboration", "Permissions")
        for x in viewer:
            entry = Permission(role=Role.VIEWER, permission=x)
            entry.save()

        for x in collaborator:
            entry = Permission(role=Role.COLLABORATOR, permission=x)
            entry.save()

        for x in owner:
            entry = Permission(role=Role.OWNER, permission=x)
            entry.save()

    operations = [
        migrations.RunPython(insertData),
    ]
