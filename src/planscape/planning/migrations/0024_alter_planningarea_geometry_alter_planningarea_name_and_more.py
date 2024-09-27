from django.conf import settings
import django.contrib.gis.db.models.fields
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("planning", "0023_auto_20240903_1318"),
    ]

    operations = [
        migrations.AlterField(
            model_name="planningarea",
            name="geometry",
            field=django.contrib.gis.db.models.fields.MultiPolygonField(
                help_text="Geometry of the Planning Area represented by polygons.",
                null=True,
                srid=4269,
            ),
        ),
        migrations.AlterField(
            model_name="planningarea",
            name="name",
            field=models.CharField(
                help_text="Name of the Planning Area.", max_length=120
            ),
        ),
        migrations.AlterField(
            model_name="planningarea",
            name="notes",
            field=models.TextField(help_text="Notes of the Planning Area.", null=True),
        ),
        migrations.AlterField(
            model_name="planningarea",
            name="region_name",
            field=models.CharField(
                choices=[
                    ("sierra-nevada", "Sierra Nevada"),
                    ("southern-california", "Southern California"),
                    ("central-coast", "Central Coast"),
                    ("northern-california", "Northern California"),
                ],
                help_text="Region choice name of the Planning Area.",
                max_length=120,
            ),
        ),
        migrations.AlterField(
            model_name="planningarea",
            name="user",
            field=models.ForeignKey(
                help_text="User ID that created the Planning Area.",
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="planning_areas",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="projectarea",
            name="data",
            field=models.JSONField(
                help_text="Project Area data from Forsys.", null=True
            ),
        ),
        migrations.AlterField(
            model_name="projectarea",
            name="geometry",
            field=django.contrib.gis.db.models.fields.MultiPolygonField(
                help_text="Geometry of the Project Area.", srid=4269
            ),
        ),
        migrations.AlterField(
            model_name="projectarea",
            name="name",
            field=models.CharField(
                help_text="Name of the Project Area.", max_length=128
            ),
        ),
        migrations.AlterField(
            model_name="scenario",
            name="configuration",
            field=models.JSONField(default=dict, help_text="Scenario configuration."),
        ),
        migrations.AlterField(
            model_name="scenario",
            name="name",
            field=models.CharField(help_text="Name of the Scenario.", max_length=120),
        ),
        migrations.AlterField(
            model_name="scenario",
            name="notes",
            field=models.TextField(help_text="Scenario notes.", null=True),
        ),
        migrations.AlterField(
            model_name="scenario",
            name="origin",
            field=models.CharField(
                choices=[("SYSTEM", "System"), ("USER", "User")],
                help_text="Scenario Origin.",
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="scenario",
            name="planning_area",
            field=models.ForeignKey(
                help_text="Planning Area ID.",
                on_delete=django.db.models.deletion.CASCADE,
                related_name="scenarios",
                to="planning.planningarea",
            ),
        ),
        migrations.AlterField(
            model_name="scenario",
            name="result_status",
            field=models.CharField(
                choices=[
                    ("PENDING", "Pending"),
                    ("RUNNING", "Running"),
                    ("SUCCESS", "Success"),
                    ("FAILURE", "Failure"),
                    ("PANIC", "Panic"),
                    ("TIMED_OUT", "Timed Out"),
                ],
                help_text="Result status of the Scenario.",
                max_length=32,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="scenario",
            name="status",
            field=models.CharField(
                choices=[("ACTIVE", "Active"), ("ARCHIVED", "Archived")],
                default="ACTIVE",
                help_text="Scenario status.",
                max_length=32,
            ),
        ),
        migrations.AlterField(
            model_name="scenario",
            name="user",
            field=models.ForeignKey(
                blank=True,
                help_text="User ID that created the Scenario.",
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="scenarios",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="scenario",
            name="uuid",
            field=models.UUIDField(
                default=uuid.uuid4,
                help_text="Scenarion Universally Unique Identifier.",
                unique=True,
            ),
        ),
        migrations.AlterField(
            model_name="scenarioresult",
            name="completed_at",
            field=models.DateTimeField(
                help_text="End of the Forsys run, in UTC timezone.", null=True
            ),
        ),
        migrations.AlterField(
            model_name="scenarioresult",
            name="started_at",
            field=models.DateTimeField(
                help_text="Start of the Forsys run, in UTC timezone.", null=True
            ),
        ),
    ]
