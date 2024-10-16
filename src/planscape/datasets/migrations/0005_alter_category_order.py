from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0004_datalayer_mimetype_datalayer_original_name"),
    ]

    operations = [
        migrations.AlterField(
            model_name="category",
            name="order",
            field=models.IntegerField(
                default=0,
                help_text="If necessary, changing the order allows the users to configure what categories appears first.",
                null=True,
            ),
        ),
    ]
