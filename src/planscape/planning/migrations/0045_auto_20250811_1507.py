from django.db import migrations


def forward(apps, schema_editor):
    pass


def backward(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [("planning", "0044_add_secondary_metrics")]
    operations = [migrations.RunPython(forward, backward)]
