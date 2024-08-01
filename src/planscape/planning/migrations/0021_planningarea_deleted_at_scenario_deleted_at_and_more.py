from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0020_scenario_result_status"),
    ]

    operations = [
        migrations.AddField(
            model_name="planningarea",
            name="deleted_at",
            field=models.DateTimeField(
                help_text="Define if the entity has been deleted or not and when",
                null=True,
                verbose_name="Deleted at",
            ),
        ),
        migrations.AddField(
            model_name="scenario",
            name="deleted_at",
            field=models.DateTimeField(
                help_text="Define if the entity has been deleted or not and when",
                null=True,
                verbose_name="Deleted at",
            ),
        ),
        migrations.AddField(
            model_name="scenarioresult",
            name="deleted_at",
            field=models.DateTimeField(
                help_text="Define if the entity has been deleted or not and when",
                null=True,
                verbose_name="Deleted at",
            ),
        ),
    ]
