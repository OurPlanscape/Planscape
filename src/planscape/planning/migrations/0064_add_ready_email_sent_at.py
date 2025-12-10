from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0063_auto_20251110_2010"),
    ]

    operations = [
        migrations.AddField(
            model_name="scenario",
            name="ready_email_sent_at",
            field=models.DateTimeField(
                blank=True, help_text="When the ready email was sent.", null=True
            ),
        ),
    ]
