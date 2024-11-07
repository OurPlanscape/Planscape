from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0006_alter_datalayer_options"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="datalayer",
            constraint=models.UniqueConstraint(
                fields=("dataset", "name", "type"), name="datalayer_unique_constraint"
            ),
        ),
    ]
