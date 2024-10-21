from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("impacts", "0006_alter_treatmentresult_variable"),
    ]

    operations = [
        migrations.AddField(
            model_name="treatmentresult",
            name="type",
            field=models.CharField(
                choices=[("DIRECT", "Direct"), ("INDIRECT", "Indirect")],
                default="DIRECT",
                help_text="Type of Treatment Result (choice).",
            ),
        ),
    ]
