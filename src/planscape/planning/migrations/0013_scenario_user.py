from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


def forwards_func(apps, schema_editor):
    Scenario = apps.get_model("planning", "Scenario")
    for scenario in Scenario.objects.all():
        planning_area = scenario.planning_area
        scenario.user = planning_area.user
        scenario.save()


def reverse_func(apps, schema_editor):
    Scenario = apps.get_model("planning", "Scenario")
    for scenario in Scenario.objects.all():
        scenario.user = None
        scenario.save()


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("planning", "0012_sharedlink"),
    ]

    operations = [
        migrations.AddField(
            model_name="scenario",
            name="user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="scenarios",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.RunPython(forwards_func, reverse_func),
    ]
