from django.db import migrations
from django.conf import settings
from django.contrib.auth import get_user_model

# from organizations.models import Organization


def create_admin_user_and_org(apps, schema_editor):
    Organization = apps.get_model("organizations", "Organization")
    User = get_user_model()
    admin = User.objects.create(
        username="admin",
        first_name="admin",
        last_name="planscape",
        email="admin@planscape.org",
        is_staff=True,
        is_active=True,
        is_superuser=True,
    )
    admin.set_unusable_password()
    admin.save()
    # _ = Organization.objects.create(
    #     uuid=settings.ADMIN_ORG_UUID,
    #     created_by=admin,
    #     name="SIG-GIS",
    # )


class Migration(migrations.Migration):
    dependencies = [
        ("organizations", "0001_initial"),
        ("auth", "0012_alter_user_first_name_max_length"),
        ("password_policies", "0005_alter_passwordrecord_options"),
        ("socialaccount", "0005_socialtoken_nullable_app"),
    ]

    operations = [migrations.RunPython(create_admin_user_and_org)]
