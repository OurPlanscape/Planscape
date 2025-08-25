import django.core.serializers.json
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0047_add_wildfire_treatment_goals"),
    ]

    operations = [
        migrations.AddField(
            model_name="scenario",
            name="forsys_input",
            field=models.JSONField(
                encoder=django.core.serializers.json.DjangoJSONEncoder,
                help_text="Forsys input data for the Scenario.",
                null=True,
            ),
        ),
    ]
