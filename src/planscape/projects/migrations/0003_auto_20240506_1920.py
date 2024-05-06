from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0002_auto_20240425_1845"),
    ]

    operations = [migrations.RenameField("Project", "created_by", "owner")]
