from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("funding_report", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="fundingopportunityreport",
            name="results",
            field=models.JSONField(
                help_text="Funding opportunity report calculation results.",
                null=True,
            ),
        ),
    ]
