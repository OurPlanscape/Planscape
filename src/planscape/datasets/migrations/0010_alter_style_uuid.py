from django.db import migrations, models
import uuid


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0009_style_data_hash"),
    ]

    operations = [
        migrations.AlterField(
            model_name="style",
            name="uuid",
            field=models.UUIDField(default=uuid.uuid4, null=True),
        ),
    ]
