import django.core.serializers.json
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0026_alter_planningareanote_planning_area_projectareanote"),
    ]

    operations = [
        migrations.AlterField(
            model_name="projectarea",
            name="data",
            field=models.JSONField(
                encoder=django.core.serializers.json.DjangoJSONEncoder,
                help_text="Project Area data from Forsys.",
                null=True,
            ),
        ),
    ]
