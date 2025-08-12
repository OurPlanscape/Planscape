from django.db import migrations

SECONDARY_LAYER_NAMES = [
    "Probability of Fire Severity - High",
    "Probability of Fire Severity - Low",
    "Total Aboveground Carbon",
    "Damage Potential",
    "Structure Exposure Score",
]


def apply_migration(apps, schema_editor):
    from planning.models import TreatmentGoalUsageType

    secondary_usage = TreatmentGoalUsageType.SECONDARY_METRIC
    TreatmentGoal = apps.get_model("planning", "TreatmentGoal")
    TGDataLayerRelation = apps.get_model("planning", "TreatmentGoalUsesDataLayer")
    DataLayer = apps.get_model("datasets", "DataLayer")
    available_layers = {}
    for name in SECONDARY_LAYER_NAMES:
        layer = DataLayer.objects.filter(name__iexact=name).first()
        if layer:
            available_layers[name] = layer

    if not available_layers:
        return

    for tg in TreatmentGoal.objects.filter(active=True):
        for layer in available_layers.values():
            TGDataLayerRelation.objects.get_or_create(
                treatment_goal=tg,
                datalayer=layer,
                usage_type=secondary_usage,
                defaults={"threshold": None},
            )

        TGDataLayerRelation.objects.filter(
            treatment_goal=tg,
            usage_type=secondary_usage,
        ).exclude(datalayer__in=available_layers.values()).delete()


def reverse_migration(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0043_scenario_geopackage_status"),
        ("datasets", "0018_alter_datalayer_url"),
    ]

    operations = [
        migrations.RunPython(apply_migration, reverse_migration),
    ]
