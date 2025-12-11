from django.db import migrations

PLANNING_AREA_MAP_STATUS_OVERSIZE = "OVERSIZE"


def enqueue_prepare_planning_area_tasks(apps, schema_editor):
    """
    For every non-oversize PlanningArea, enqueue the prepare_planning_area Celery task
    so that stand metrics are re-calculated for the new exclusion layers.
    """
    planning_area_model = apps.get_model("planning", "PlanningArea")

    from planning.tasks import prepare_planning_area

    non_oversize_planning_areas = planning_area_model.objects.exclude(
        map_status=PLANNING_AREA_MAP_STATUS_OVERSIZE
    ).only("pk")

    for planning_area in non_oversize_planning_areas.iterator():
        prepare_planning_area.delay(planning_area_id=planning_area.pk)


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0067_alter_scenario_ready_email_sent_at"),
    ]

    operations = [
        migrations.RunPython(
            enqueue_prepare_planning_area_tasks,
            migrations.RunPython.noop,
        ),
    ]
