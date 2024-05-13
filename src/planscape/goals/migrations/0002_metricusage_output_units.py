from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("goals", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="metricusage",
            name="output_units",
            field=models.CharField(
                help_text="Allows the user to override dataset.data_units, in the forsys reporting pages.",
                max_length=128,
                null=True,
            ),
        ),
    ]
