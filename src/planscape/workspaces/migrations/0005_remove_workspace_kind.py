from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("workspaces", "0004_workspace_invite_fields"),
        # the backfill reads `kind`, so it runs before the column is gone
        ("datasets", "0036_backfill_datalayer_origin"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="workspace",
            name="kind",
        ),
    ]
