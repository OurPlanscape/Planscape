from django.db import migrations, models
import uuid


class Migration(migrations.Migration):
    dependencies = [
        ("metrics", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="metric",
            name="created_at",
            field=models.DateTimeField(auto_now_add=True, null=True),
        ),
        migrations.AddField(
            model_name="metric",
            name="deleted_at",
            field=models.DateTimeField(
                help_text="Define if the entity has been deleted or not and when",
                null=True,
                verbose_name="Deleted at",
            ),
        ),
        migrations.AddField(
            model_name="metric",
            name="updated_at",
            field=models.DateTimeField(auto_now=True),
        ),
        migrations.AddField(
            model_name="metric",
            name="uuid",
            field=models.UUIDField(db_index=True, default=uuid.uuid4),
        ),
    ]
