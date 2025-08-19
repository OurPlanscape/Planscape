from django.db import migrations


def forward(apps, schema_editor):
    TreatmentGoal = apps.get_model("planning", "TreatmentGoal")
    from django.contrib.gis.geos import MultiPolygon, Polygon

    for t in TreatmentGoal.objects.all():
        geom = t.datalayers.all().geometric_intersection()
        if not geom:
            continue
        if isinstance(geom, Polygon):
            geom = MultiPolygon(geom)
        t.geometry = geom
        t.save(update_fields=["geometry"])


def backward(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [("planning", "0044_add_secondary_metrics")]
    operations = [migrations.RunPython(forward, backward)]
