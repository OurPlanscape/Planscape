from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0002_auto_20240925_1739"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="organization",
            constraint=models.UniqueConstraint(
                fields=("name",), name="organization_name_unique"
            ),
        ),
    ]
