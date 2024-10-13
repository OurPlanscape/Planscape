from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0002_category_organization_datalayer_category_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="datalayer",
            name="uuid",
            field=models.UUIDField(null=True),
        ),
    ]
