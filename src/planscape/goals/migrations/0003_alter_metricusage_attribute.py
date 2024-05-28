from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("goals", "0002_metricusage_output_units"),
    ]

    operations = [
        migrations.AlterField(
            model_name="metricusage",
            name="attribute",
            field=models.CharField(
                choices=[
                    ("min", "Min"),
                    ("max", "Max"),
                    ("mean", "Mean"),
                    ("sum", "Sum"),
                    ("majority", "Majority"),
                    ("minority", "Minority"),
                    ("COUNT", "Count"),
                    ("FIELD", "Field"),
                ],
                default="mean",
                max_length=64,
            ),
        ),
    ]
