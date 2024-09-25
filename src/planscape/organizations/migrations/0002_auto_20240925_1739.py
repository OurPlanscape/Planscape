from django.db import migrations

from organizations.models import OrganizationType


def create_sig(apps, schema_editor):
    Organization = apps.get_model("organizations", "Organization")
    User = apps.get_model("auth", "User")
    user_defaults = {
        "first_name": "Admin",
        "last_name": "Planscape",
        "is_staff": True,
        "is_active": True,
        "is_superuser": True,
    }
    user, _created = User.objects.update_or_create(
        email="admin@planscape.org",
        defaults=user_defaults,
    )
    _sig_gis, _created = Organization.objects.update_or_create(
        created_by=user,
        name="Spatial Informatics Group",
        type=OrganizationType.COMMERCIAL,
        website="https://sig-gis.com",
    )


def delete_sig(apps, schema_editor):
    Organization = apps.get_model("organizations", "Organization")
    Organization.objects.get(name="Spatial Informatics Group").delete()


class Migration(migrations.Migration):
    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
        ("organizations", "0001_initial"),
    ]

    operations = [migrations.RunPython(create_sig, delete_sig)]
