import django.core.serializers.json
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0048_scale_pct_area_to_percent"),
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
