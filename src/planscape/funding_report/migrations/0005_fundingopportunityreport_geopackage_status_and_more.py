from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("funding_report", "0004_fundingopportunityreportrun"),
    ]

    operations = [
        migrations.AddField(
            model_name="fundingopportunityreport",
            name="geopackage_status",
            field=models.CharField(
                choices=[
                    ("SUCCEEDED", "Succeeded"),
                    ("PROCESSING", "Processing"),
                    ("PENDING", "Pending"),
                    ("FAILED", "Failed"),
                ],
                help_text="Status of the geopackage generation.",
                max_length=32,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="fundingopportunityreport",
            name="geopackage_url",
            field=models.URLField(
                help_text="Cloud storage URL of the generated geopackage.", null=True
            ),
        ),
    ]
