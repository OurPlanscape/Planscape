from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0004_alter_organization_owner"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("projects", "0003_auto_20240506_1920"),
    ]

    operations = [
        migrations.AlterField(
            model_name="project",
            name="organization",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.RESTRICT,
                related_name="projects",
                to="organizations.organization",
            ),
        ),
        migrations.AlterField(
            model_name="project",
            name="owner",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.RESTRICT,
                related_name="owned_projects",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
