from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("workspaces", "0004_workspace_invite_fields"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="workspace",
            name="kind",
        ),
    ]
