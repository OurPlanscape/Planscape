from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("stands", "0011_remove_stand_unique_stand_gridkey_size_cst_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="standmetric",
            name="median",
            field=models.FloatField(null=True),
        ),
    ]
