from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0002_auto_20240425_1716"),
    ]

    operations = [migrations.RenameField("Organization", "created_by", "owner")]
