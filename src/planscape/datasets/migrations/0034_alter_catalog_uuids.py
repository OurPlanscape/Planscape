import uuid

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0033_catalog_uuids"),
    ]

    operations = [
        migrations.AlterField(
            model_name=model_name,
            name="uuid",
            field=models.UUIDField(db_index=True, default=uuid.uuid4),
        )
        for model_name in (
            "dataset",
            "category",
            "simplecategory",
            "style",
            "datalayer",
        )
    ]
