from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0034_alter_catalog_uuids"),
    ]

    operations = [
        migrations.AddField(
            model_name="datalayer",
            name="origin",
            field=models.CharField(
                choices=[("PLANSCAPE", "Planscape"), ("USER", "User")],
                db_index=True,
                default="PLANSCAPE",
                help_text="Whether the Planscape team or a user uploaded the datalayer.",
                max_length=16,
            ),
        ),
    ]
