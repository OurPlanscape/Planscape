from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("funding_report", "0008_fundingopportunityreport_aet_datalayer"),
    ]

    operations = [
        migrations.AlterField(
            model_name="fundingopportunityreport",
            name="status",
            field=models.CharField(
                choices=[
                    ("PENDING", "Pending"),
                    ("RUNNING", "Running"),
                    ("SUCCESS", "Success"),
                    ("FAILED", "Failed"),
                    ("EMPTY", "Empty"),
                ],
                default="PENDING",
                help_text="Status of the Funding Opportunity Report.",
                max_length=16,
            ),
        ),
    ]
