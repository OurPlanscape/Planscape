from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0035_datalayer_origin"),
    ]

    operations = [
        migrations.AlterField(
            model_name="datalayer",
            name="status",
            field=models.CharField(
                choices=[
                    ("READY", "Ready"),
                    ("PENDING", "Pending"),
                    ("PROCESSING", "Processing"),
                    ("FAILED", "Failed"),
                ],
                default="PENDING",
                help_text="Status of the file relative to our system.",
            ),
        ),
        migrations.AddField(
            model_name="datalayer",
            name="failure_reason",
            field=models.TextField(
                blank=True,
                help_text="Why processing failed, shown to the uploader.",
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="datalayer",
            name="raw_url",
            field=models.CharField(
                blank=True,
                db_index=True,
                help_text="Where a workspace upload lands before processing.",
                max_length=1024,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="datalayer",
            name="file_size",
            field=models.BigIntegerField(
                blank=True,
                help_text="Size in bytes of the uploaded file.",
                null=True,
            ),
        ),
        migrations.RemoveConstraint(
            model_name="datalayer",
            name="datalayer_unique_constraint",
        ),
        migrations.AddConstraint(
            model_name="datalayer",
            constraint=models.UniqueConstraint(
                condition=Q(deleted_at__isnull=True),
                fields=("dataset", "name", "type"),
                name="datalayer_unique_constraint",
            ),
        ),
    ]
