from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("stands", "0009_remove_standmetric_unique_stand_metric_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="stand",
            name="size",
            field=models.CharField(
                choices=[("SMALL", "Small"), ("MEDIUM", "Medium"), ("LARGE", "Large")],
                db_index=True,
                max_length=16,
            ),
        ),
    ]
