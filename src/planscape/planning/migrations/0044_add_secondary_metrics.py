from django.db import migrations

SECONDARY_USAGE = "SECONDARY_METRIC"

SECONDARY_LAYER_NAMES = [
    "Probability of Fire Severity - High",
    "Probability of Fire Severity - Low",
    "Total Aboveground Carbon",
    "Damage Potential",
    "Structure Exposure Score",
]

def apply_migration(apps, schema_editor):
    TreatmentGoal          = apps.get_model("planning",  "TreatmentGoal")
    TGDataLayerRelation    = apps.get_model("planning",  "TreatmentGoalUsesDataLayer")
    DataLayer              = apps.get_model("datasets",  "DataLayer")

    required_layers = {
        name: DataLayer.objects.get(name__iexact=name)
        for name in SECONDARY_LAYER_NAMES
    }

    for tg in TreatmentGoal.objects.filter(active=True):
        for layer in required_layers.values():
            TGDataLayerRelation.objects.get_or_create(
                treatment_goal=tg,
                datalayer=layer,
                usage_type=SECONDARY_USAGE,
                defaults={"threshold": None},
            )

        TGDataLayerRelation.objects.filter(
            treatment_goal=tg,
            usage_type=SECONDARY_USAGE,
        ).exclude(datalayer__in=required_layers.values()).delete()


def reverse_migration(apps, schema_editor):
    TGDataLayerRelation = apps.get_model("planning", "TreatmentGoalUsesDataLayer")
    TGDataLayerRelation.objects.filter(
        usage_type=SECONDARY_USAGE,
        datalayer__name__in=SECONDARY_LAYER_NAMES,
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("planning",  "0043_scenario_geopackage_status"),
        ("datasets",  "0018_alter_datalayer_url"),
    ]

    operations = [
        migrations.RunPython(apply_migration, reverse_migration),
    ]