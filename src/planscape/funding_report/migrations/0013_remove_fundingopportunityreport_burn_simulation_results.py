from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("funding_report", "0012_fundingopportunityreport_burn_simulation_results"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="fundingopportunityreport",
            name="burn_simulation_results",
        ),
    ]
