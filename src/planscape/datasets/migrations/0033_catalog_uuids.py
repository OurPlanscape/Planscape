from django.db import migrations, models

TABLES = (
    "datasets_dataset",
    "datasets_category",
    "datasets_simplecategory",
    "datasets_style",
    "datasets_datalayer",
)


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0032_rename_simple_categories"),
    ]

    operations = [
        migrations.AddField(
            model_name="dataset",
            name="uuid",
            field=models.UUIDField(null=True),
        ),
        migrations.AddField(
            model_name="category",
            name="uuid",
            field=models.UUIDField(null=True),
        ),
        migrations.AddField(
            model_name="simplecategory",
            name="uuid",
            field=models.UUIDField(null=True),
        ),
        # One uuid per row; an AddField default would give every row the same value.
        *(
            migrations.RunSQL(
                f"UPDATE {table} SET uuid = gen_random_uuid() WHERE uuid IS NULL",
                migrations.RunSQL.noop,
            )
            for table in TABLES
        ),
    ]
