from django.conf import settings
from django.db import connection, migrations


def create_climate_foresight_dataset(apps, schema_editor):
    Dataset = apps.get_model("datasets", "Dataset")
    User = apps.get_model("auth", "User")
    Organization = apps.get_model("organizations", "Organization")

    user = User.objects.filter(email=settings.DEFAULT_ADMIN_EMAIL).first()
    org = Organization.objects.filter(name=settings.DEFAULT_ORGANIZATION_NAME).first()

    dataset, created = Dataset.objects.get_or_create(
        id=settings.CLIMATE_FORESIGHT_DATASET_ID,
        defaults={
            "created_by": user,
            "organization": org,
            "name": "Climate Foresight Internal",
            "description": "Internal dataset for Climate Foresight generated outputs (normalized layers, rollups, etc.)",
            "visibility": "PRIVATE",
        },
    )

    if created:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT setval('datasets_dataset_id_seq', GREATEST((SELECT MAX(id) FROM datasets_dataset), %s))",
                [settings.CLIMATE_FORESIGHT_DATASET_ID],
            )


def delete_climate_foresight_dataset(apps, schema_editor):
    Dataset = apps.get_model("datasets", "Dataset")
    try:
        Dataset.objects.filter(pk=settings.CLIMATE_FORESIGHT_DATASET_ID).delete()
    except Dataset.DoesNotExist:
        pass


class Migration(migrations.Migration):
    dependencies = [
        ("climate_foresight", "0010_add_landscape_and_promote_models"),
        ("datasets", "0015_add_vector_styles"),
        ("organizations", "0004_alter_organization_options"),
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.RunPython(
            create_climate_foresight_dataset,
            delete_climate_foresight_dataset,
        )
    ]
