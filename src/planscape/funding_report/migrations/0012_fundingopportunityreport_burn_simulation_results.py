from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        (
            "funding_report",
            "0011_fundingopportunityreport_burn_simulation_job_id_and_more",
        ),
    ]

    operations = [
        migrations.AddField(
            model_name="fundingopportunityreport",
            name="burn_simulation_results",
            field=models.JSONField(
                help_text="Burn-emulator post-processing results.", null=True
            ),
        ),
    ]
