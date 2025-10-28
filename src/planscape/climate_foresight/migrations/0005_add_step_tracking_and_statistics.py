# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("climate_foresight", "0004_add_normalized_datalayer"),
    ]

    operations = [
        migrations.AddField(
            model_name="climateforesightrun",
            name="current_step",
            field=models.IntegerField(
                default=1,
                help_text="Current step user is on (1=data layers, 2=favorability, 3=pillars, 4=run)",
            ),
        ),
        migrations.AddField(
            model_name="climateforesightrun",
            name="furthest_step",
            field=models.IntegerField(
                default=1,
                help_text="Furthest step completed (enables resume/skip forward)",
            ),
        ),
        migrations.AddField(
            model_name="climateforesightruninputdatalayer",
            name="outlier_thresholds",
            field=models.JSONField(
                blank=True,
                null=True,
                help_text="Percentile thresholds for outlier detection (e.g., {p5, p10, p90, p95})",
            ),
        ),
        migrations.AddField(
            model_name="climateforesightruninputdatalayer",
            name="statistics_calculated",
            field=models.BooleanField(
                default=False,
                help_text="Whether statistics have been calculated for this layer",
            ),
        ),
    ]
