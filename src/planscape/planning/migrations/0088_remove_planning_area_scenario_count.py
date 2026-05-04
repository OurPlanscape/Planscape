from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0087_scenario_post_process_status"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="planningarea",
            name="scenario_count",
        ),
    ]
