from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0002_auto_20260507_1835"),
    ]

    operations = [
        migrations.AlterField(
            model_name="restorebacktrack",
            name="status",
            field=models.CharField(
                choices=[
                    ("RUNNING", "Running"),
                    ("SUCCESS", "Success"),
                    ("FAILED", "Failed"),
                ],
                default="RUNNING",
                help_text="Status of Back Track.",
                max_length=20,
            ),
        ),
    ]
