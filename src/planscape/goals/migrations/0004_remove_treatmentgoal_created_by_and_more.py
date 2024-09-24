from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("goals", "0003_alter_metricusage_attribute"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="treatmentgoal",
            name="created_by",
        ),
        migrations.RemoveField(
            model_name="treatmentgoal",
            name="metrics",
        ),
        migrations.RemoveField(
            model_name="treatmentgoal",
            name="project",
        ),
        migrations.RemoveField(
            model_name="treatmentgoalcategory",
            name="created_by",
        ),
        migrations.RemoveField(
            model_name="treatmentgoalcategory",
            name="project",
        ),
        migrations.DeleteModel(
            name="MetricUsage",
        ),
        migrations.DeleteModel(
            name="TreatmentGoal",
        ),
        migrations.DeleteModel(
            name="TreatmentGoalCategory",
        ),
    ]
