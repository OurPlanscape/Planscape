import django.core.validators
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0017_add_existing_projects_layer"),
    ]

    operations = [
        migrations.AlterField(
            model_name="datalayer",
            name="url",
            field=models.CharField(
                max_length=1024,
                null=True,
                validators=[
                    django.core.validators.URLValidator(
                        regex="^((s3|gs):\\/\\/[^\\/]+\\/.+)|((http|https|ftp|ftps):\\/\\/[^\\s\\/$.?#].[^\\s]*)$",
                        schemes=["s3", "gs", "http", "https", "ftp", "ftps"],
                    )
                ],
            ),
        ),
    ]
