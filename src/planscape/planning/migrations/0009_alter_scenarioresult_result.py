import django.core.serializers.json
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0008_auto_20231027_2211"),
    ]

    operations = [
        migrations.AlterField(
            model_name="scenarioresult",
            name="result",
            field=models.JSONField(
                encoder=django.core.serializers.json.DjangoJSONEncoder, null=True
            ),
        ),
    ]
