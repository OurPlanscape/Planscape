from django.db import migrations
from modules.base import get_module
from planning.models import Scenario

FUNDING_REPORT_CAPABILITY = "FUNDING_REPORT"
ROW_FETCH_CHUNK_SIZE = 1000
ROW_UPDATE_BATCH_SIZE = 500


def backfill_funding_report_capability(apps, schema_editor):
    # Uses the live model because FundingReportModule.can_run matches on the
    # live Scenario class. Only the columns needed here are loaded, so columns
    # added to the live model later won't break this migration.
    module = get_module("funding_report")
    scenarios = (
        Scenario.objects.exclude(capabilities__contains=[FUNDING_REPORT_CAPABILITY])
        .filter(planning_area__geometry__isnull=False)
        .select_related("planning_area")
        .only("id", "capabilities", "planning_area__id", "planning_area__geometry")
        .order_by("pk")
    )

    batch = []
    for scenario in scenarios.iterator(chunk_size=ROW_FETCH_CHUNK_SIZE):
        if not module.can_run(scenario):
            continue
        scenario.capabilities = [
            *(scenario.capabilities or []),
            FUNDING_REPORT_CAPABILITY,
        ]
        batch.append(scenario)
        if len(batch) == ROW_UPDATE_BATCH_SIZE:
            Scenario.objects.bulk_update(batch, ["capabilities"])
            batch = []
    if batch:
        Scenario.objects.bulk_update(batch, ["capabilities"])


class Migration(migrations.Migration):
    atomic = False

    dependencies = [
        ("planning", "0096_treatmentgoalcategory_model"),
    ]

    operations = [
        migrations.RunPython(
            backfill_funding_report_capability,
            migrations.RunPython.noop,
        ),
    ]
