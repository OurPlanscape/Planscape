import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0092_scenario_parent_alter_scenario_type"),
        ("workspaces", "0003_workspace_planning_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="planningarea",
            name="workspace",
            field=models.ForeignKey(
                blank=True,
                help_text="Workspace this Planning Area belongs to.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="planning_areas",
                to="workspaces.workspace",
            ),
        ),
    ]
