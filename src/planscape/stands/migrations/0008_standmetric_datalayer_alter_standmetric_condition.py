from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0006_alter_datalayer_options"),
        ("conditions", "0009_auto_20231222_0900"),
        ("stands", "0007_alter_stand_created_at_alter_standmetric_created_at"),
    ]

    operations = [
        migrations.AddField(
            model_name="standmetric",
            name="datalayer",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="metrics",
                to="datasets.datalayer",
            ),
        ),
        migrations.AlterField(
            model_name="standmetric",
            name="condition",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="metrics",
                to="conditions.condition",
            ),
        ),
    ]
