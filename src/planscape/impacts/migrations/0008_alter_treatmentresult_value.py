from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("impacts", "0007_treatmentresult_type"),
    ]

    operations = [
        migrations.AlterField(
            model_name="treatmentresult",
            name="value",
            field=models.FloatField(
                help_text="Value extracted for the prescription stand, based on variable, year and variable aggreation type.",
                null=True,
            ),
        ),
    ]
