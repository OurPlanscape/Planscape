from django.db import migrations

# Icons are left empty; the frontend decides which icon to show.
CATEGORIES = [
    "Air Quality",
    "Carbon Storage",
    "Economic Prosperity",
    "Fire Dynamics",
    "Fire-Adapted Communities",
    "Forest Health",
    "Human Well-Being",
    "Operational Layers",
    "Water Security",
    "Wetland Integrity",
    "Wildlife & Plant Conservation",
]


def create_categories(apps, schema_editor):
    SimpleCategory = apps.get_model("datasets", "SimpleCategory")
    for name in CATEGORIES:
        SimpleCategory.objects.get_or_create(name=name)


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0030_workspacefavoritedatalayer"),
    ]

    operations = [
        migrations.RunPython(create_categories, migrations.RunPython.noop),
    ]
