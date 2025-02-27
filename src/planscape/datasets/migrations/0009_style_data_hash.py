from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0008_style_datalayerhasstyle_datalayer_styles_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="style",
            name="data_hash",
            field=models.CharField(max_length=256, null=True),
        ),
    ]
