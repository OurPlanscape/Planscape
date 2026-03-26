from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("impacts", "0022_treatmentresult_forested_rate"),
    ]

    operations = [
        migrations.AddField(
            model_name="treatmentplan",
            name="stand_size",
            field=models.CharField(
                choices=[
                    ("SMALL", "Small"),
                    ("MEDIUM", "Medium"),
                    ("LARGE", "Large"),
                ],
                max_length=16,
                null=True,
                blank=True,
                help_text="Stand size for this treatment plan.",
            ),
        ),
    ]
