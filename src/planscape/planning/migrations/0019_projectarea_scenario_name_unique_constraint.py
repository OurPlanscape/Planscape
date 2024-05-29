from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0018_projectarea"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="projectarea",
            constraint=models.UniqueConstraint(
                fields=("scenario", "name"), name="scenario_name_unique_constraint"
            ),
        ),
    ]
