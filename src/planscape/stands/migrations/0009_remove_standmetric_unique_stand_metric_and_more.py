from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("stands", "0008_standmetric_datalayer_alter_standmetric_condition"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="standmetric",
            name="unique_stand_metric",
        ),
        migrations.AddConstraint(
            model_name="standmetric",
            constraint=models.UniqueConstraint(
                fields=("stand", "datalayer"), name="unique_stand_metric"
            ),
        ),
    ]
