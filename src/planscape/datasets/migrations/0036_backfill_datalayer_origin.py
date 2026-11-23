from django.db import migrations


def backfill_user_uploads(apps, schema_editor):
    """Datalayers in planning workspaces were uploaded by users."""
    DataLayer = apps.get_model("datasets", "DataLayer")
    DataLayer.objects.filter(dataset__workspace__kind="PLANNING").update(
        origin="USER"
    )


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0035_datalayer_origin"),
        ("workspaces", "0004_workspace_invite_fields"),
    ]

    operations = [
        migrations.RunPython(backfill_user_uploads, migrations.RunPython.noop),
    ]
