from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("climate_foresight", "0013_update_pillar_names"),
    ]

    operations = [
        migrations.AlterField(
            model_name="climateforesightrun",
            name="status",
            field=models.CharField(
                choices=[
                    ("draft", "Draft"),
                    ("running", "Running"),
                    ("done", "Done"),
                    ("failed", "Failed"),
                ],
                default="draft",
                help_text="Current status of the run",
                max_length=20,
            ),
        ),
    ]
