from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("impacts", "0024_populate_treatmentplan_stand_size"),
    ]

    operations = [
        migrations.AlterField(
            model_name="treatmentplan",
            name="stand_size",
            field=models.CharField(
                choices=[
                    ("SMALL", "Small"),
                    ("MEDIUM", "Medium"),
                    ("LARGE", "Large"),
                ],
                default="LARGE",
                max_length=16,
                help_text="Stand size for this treatment plan.",
            ),
        ),
    ]
