from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0003_alter_organization_created_by"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("projects", "0002_auto_20240425_1845"),
    ]

    operations = [
        migrations.AlterField(
            model_name="project",
            name="created_by",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.RESTRICT,
                related_name="created_projects",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="project",
            name="organization",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.RESTRICT,
                related_name="projects",
                to="organizations.organization",
            ),
        ),
    ]
