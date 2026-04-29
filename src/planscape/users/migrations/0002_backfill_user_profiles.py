from django.conf import settings
from django.db import migrations


def create_missing_profiles(apps, schema_editor):
    User = apps.get_model(*settings.AUTH_USER_MODEL.split("."))
    UserProfile = apps.get_model("users", "UserProfile")

    existing_user_ids = set(UserProfile.objects.values_list("user_id", flat=True))
    profiles = [
        UserProfile(user_id=user_id)
        for user_id in User.objects.exclude(pk__in=existing_user_ids).values_list(
            "pk", flat=True
        )
    ]
    UserProfile.objects.bulk_create(profiles)


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RunPython(create_missing_profiles, migrations.RunPython.noop),
    ]
