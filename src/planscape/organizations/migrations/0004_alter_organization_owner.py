from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("organizations", "0003_auto_20240506_1913"),
    ]

    operations = [
        migrations.AlterField(
            model_name="organization",
            name="owner",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.RESTRICT,
                related_name="owned_organizations",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
