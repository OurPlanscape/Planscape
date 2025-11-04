from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("climate_foresight", "0002_add_input_datalayer"),
    ]

    operations = [
        migrations.AlterField(
            model_name="climateforesightruninputdatalayer",
            name="favor_high",
            field=models.BooleanField(
                blank=True,
                default=None,
                help_text="True if high values are favorable, False if low values are favorable, None if not yet set",
                null=True,
            ),
        ),
    ]
