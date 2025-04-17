import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0010_alter_style_uuid"),
    ]

    operations = [
        migrations.AddField(
            model_name="datalayer",
            name="hash",
            field=models.CharField(
                help_text="SHA256 hash of the original file. Calculated before upload is done, but after any transformations.",
                max_length=256,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="datalayer",
            name="storage_type",
            field=models.CharField(
                choices=[("DATABASE", "Database"), ("FILE_SYSTEM", "File System")],
                default="FILE_SYSTEM",
                max_length=64,
            ),
        ),
        migrations.AddField(
            model_name="datalayer",
            name="table",
            field=models.CharField(
                max_length=256,
                null=True,
                validators=[
                    django.core.validators.RegexValidator(
                        "^(?<schema>\\w+)\\.(?<table>\\w+)$"
                    )
                ],
            ),
        ),
        migrations.AlterField(
            model_name="datalayer",
            name="url",
            field=models.CharField(
                max_length=1024,
                null=True,
                validators=[
                    django.core.validators.URLValidator(
                        regex="^(s3:\\/\\/[^\\/]+\\/.+)|((http|https|ftp|ftps):\\/\\/[^\\s\\/$.?#].[^\\s]*)$",
                        schemes=["s3", "http", "https", "ftp", "ftps"],
                    )
                ],
            ),
        ),
    ]
