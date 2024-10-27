from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0005_alter_category_order"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="datalayer",
            options={
                "ordering": ("organization", "dataset", "id"),
                "verbose_name": "Datalayer",
                "verbose_name_plural": "Datalayers",
            },
        ),
    ]
