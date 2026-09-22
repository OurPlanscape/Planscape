import django.core.serializers.json
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0093_planningarea_workspace"),
    ]

    operations = [
        migrations.AddField(
            model_name="scenarioresult",
            name="errors",
            field=models.JSONField(
                encoder=django.core.serializers.json.DjangoJSONEncoder, null=True
            ),
        ),
    ]
