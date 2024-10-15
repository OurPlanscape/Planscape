from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0003_datalayer_uuid"),
    ]

    operations = [
        migrations.AddField(
            model_name="datalayer",
            name="mimetype",
            field=models.CharField(max_length=256, null=True),
        ),
        migrations.AddField(
            model_name="datalayer",
            name="original_name",
            field=models.CharField(max_length=1024, null=True),
        ),
    ]
