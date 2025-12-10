from django.db import migrations
from django.utils import timezone

BATCH_SIZE = 1000


def backfill_ready_email_sent_at_for_existing_success_scenarios(apps, schema_editor):
    Scenario = apps.get_model("planning", "Scenario")

    success_scenarios_queryset = Scenario.objects.filter(
        result_status="SUCCESS",
        ready_email_sent_at__isnull=True,
    )

    current_timestamp = timezone.now()

    while True:
        scenario_ids_batch = list(
            success_scenarios_queryset.values_list("id", flat=True)[:BATCH_SIZE]
        )
        if not scenario_ids_batch:
            break

        Scenario.objects.filter(id__in=scenario_ids_batch).update(
            ready_email_sent_at=current_timestamp
        )


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0064_add_ready_email_sent_at"),
    ]

    operations = [
        migrations.RunPython(
            backfill_ready_email_sent_at_for_existing_success_scenarios,
            migrations.RunPython.noop,
        ),
    ]
