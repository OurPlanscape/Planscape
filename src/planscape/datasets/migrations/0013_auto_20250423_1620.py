from django.db import migrations


def create_vector_dataset(apps, schema_editor):
    Dataset = apps.get_model("datasets", "Dataset")
    User = apps.get_model("auth", "User")
    Organization = apps.get_model("organizations", "Organization")
    user = User.objects.get(email="admin@planscape.org")
    org = Organization.objects.get(name="Spatial Inforamtics Group")
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


def delete_vector_dataset(apps, schema_editor):
    Dataset = apps.get_model("datasets", "Dataset")
    try:
        Dataset.objects.get(pk=10).delete()
    except Dataset.DoesNotExist:
        pass


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0012_auto_20250418_1307"),
    ]

    operations = [migrations.RunPython(create_vector_dataset, delete_vector_dataset)]
