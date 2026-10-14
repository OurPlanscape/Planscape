from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0028_dataset_style_datalayer_workspace"),
    ]

    operations = [
        migrations.CreateModel(
            name="SimpleCategory",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, null=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=128)),
                ("icon", models.CharField(blank=True, max_length=128, null=True)),
            ],
            options={
                "verbose_name": "Simple Category",
                "verbose_name_plural": "Simple Categories",
                "ordering": ("name", "id"),
            },
        ),
        migrations.AddField(
            model_name="datalayer",
            name="simple_categories",
            field=models.ManyToManyField(
                blank=True,
                related_name="datalayers",
                to="datasets.simplecategory",
            ),
        ),
    ]
