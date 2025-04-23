from django.conf import settings
from django.db import migrations


def create_vector_dataset(apps, schema_editor):
    Dataset = apps.get_model("datasets", "Dataset")
    Category = apps.get_model("datasets", "Category")
    User = apps.get_model("auth", "User")
    Organization = apps.get_model("organizations", "Organization")
    user = User.objects.get(email=settings.DEFAULT_ADMIN_EMAIL)
    org = Organization.objects.get(name=settings.DEFAULT_ORGANIZATION_NAME)
    vector_dataset, created = Dataset.objects.get_or_create(
        id=10,
        defaults={
            "created_by": user,
            "organization": org,
            "name": "Base DataLayers",
            "visibility": "PUBLIC",
            "version": "2025",
        },
    )
    _ = Category.add_root(
        id=996,
        name="Boundaries",
        created_by=user,
        organization=org,
        dataset=vector_dataset,
        order=0,
    )
    _ = Category.add_root(
        id=997,
        name="Ownership",
        created_by=user,
        organization=org,
        dataset=vector_dataset,
        order=0,
    )
    _ = Category.add_root(
        id=998,
        name="Disturbances",
        created_by=user,
        organization=org,
        dataset=vector_dataset,
        order=0,
    )


def delete_vector_dataset(apps, schema_editor):
    Dataset = apps.get_model("datasets", "Dataset")
    Category = apps.get_model("datasets", "Category")
    try:
        Dataset.objects.get(pk=10).delete()
        Category.objects.get(pk__in=[996, 997, 998]).delete()
    except Dataset.DoesNotExist:
        pass


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0012_auto_20250418_1307"),
        ("organizations", "0004_alter_organization_options"),
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [migrations.RunPython(create_vector_dataset, delete_vector_dataset)]
