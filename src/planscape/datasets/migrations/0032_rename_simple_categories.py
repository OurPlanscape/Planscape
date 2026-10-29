from django.db import migrations

# Aligns seeded names with the DataLayer catalog spreadsheet.
RENAMES = {
    "Forest Health": "Forest and Shrubland Resilience",
    "Operational Layers": "Operational",
}


def rename_categories(apps, schema_editor):
    SimpleCategory = apps.get_model("datasets", "SimpleCategory")
    for old, new in RENAMES.items():
        SimpleCategory.objects.filter(name=old).update(name=new)


def revert_categories(apps, schema_editor):
    SimpleCategory = apps.get_model("datasets", "SimpleCategory")
    for old, new in RENAMES.items():
        SimpleCategory.objects.filter(name=new).update(name=old)


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0031_create_top_level_simple_categories"),
    ]

    operations = [
        migrations.RunPython(rename_categories, revert_categories),
    ]
