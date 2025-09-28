from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0056_alter_planningarea_map_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="planningarea",
            name="metrics_ready_at",
            field=models.DateTimeField(null=True),
        ),
        migrations.AddField(
            model_name="planningarea",
            name="stands_ready_at",
            field=models.DateTimeField(null=True),
        ),
    ]
