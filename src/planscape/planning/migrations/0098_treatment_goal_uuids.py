from django.db import migrations, models

TABLES = (
    "planning_treatmentgoalcategory",
    "planning_treatmentgoal",
)


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0097_backfill_scenario_funding_report_capability"),
    ]

    operations = [
        migrations.AddField(
            model_name="treatmentgoalcategory",
            name="uuid",
            field=models.UUIDField(null=True),
        ),
        migrations.AddField(
            model_name="treatmentgoal",
            name="uuid",
            field=models.UUIDField(null=True),
        ),
        # One uuid per row; an AddField default would give every row the same value.
        *(
            migrations.RunSQL(
                f"UPDATE {table} SET uuid = gen_random_uuid() WHERE uuid IS NULL",
                migrations.RunSQL.noop,
            )
            for table in TABLES
        ),
    ]
