from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0041_auto_20250731_1724"),
    ]

    operations = [
        migrations.AddField(
            model_name="scenario",
            name="geopackage_url",
            field=models.URLField(
                help_text="Geopackage URL of the Scenario.", null=True
            ),
        ),
    ]
