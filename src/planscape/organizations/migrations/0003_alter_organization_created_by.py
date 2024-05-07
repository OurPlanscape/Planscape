from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("organizations", "0002_auto_20240425_1716"),
    ]

    operations = [
        migrations.AlterField(
            model_name="organization",
            name="created_by",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.RESTRICT,
                related_name="created_organizations",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
