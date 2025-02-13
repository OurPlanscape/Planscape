from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("impacts", "0021_treatmentplannote"),
    ]

    operations = [
        migrations.AddField(
            model_name="treatmentresult",
            name="forested_rate",
            field=models.FloatField(
                help_text="number between 0 and 1 that represents the rate of forested pixels in this result.",
                null=True,
            ),
        ),
    ]
