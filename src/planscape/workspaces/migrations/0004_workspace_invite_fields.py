import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("workspaces", "0003_workspace_planning_fields"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="useraccessworkspace",
            name="unique_user_workspace_access",
        ),
        migrations.AddField(
            model_name="useraccessworkspace",
            name="email",
            field=models.EmailField(
                blank=True,
                help_text="Email the invite was sent to.",
                max_length=254,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="useraccessworkspace",
            name="invited_by",
            field=models.ForeignKey(
                blank=True,
                help_text="User that sent the invite, if this row originated from one.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="sent_workspace_invites",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="useraccessworkspace",
            name="user",
            field=models.ForeignKey(
                blank=True,
                help_text="Set once a pending invite is accepted. Null while the invite is pending.",
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="workspace_access",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddConstraint(
            model_name="useraccessworkspace",
            constraint=models.UniqueConstraint(
                condition=models.Q(("user__isnull", False)),
                fields=("user", "workspace"),
                name="unique_user_workspace_access",
            ),
        ),
        migrations.AddConstraint(
            model_name="useraccessworkspace",
            constraint=models.UniqueConstraint(
                condition=models.Q(("user__isnull", True)),
                fields=("email", "workspace"),
                name="unique_email_workspace_invite",
            ),
        ),
    ]
