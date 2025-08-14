from django.db import migrations


def add_wildfire_treatment_goals(apps, schema_editor):
    TreatmentGoal = apps.get_model("planning", "TreatmentGoal")
    TGUD = apps.get_model("planning", "TreatmentGoalUsesDataLayer")
    DataLayer = apps.get_model("datasets", "DataLayer")
    User = apps.get_model("auth", "User")

    admin_user = User.objects.filter(username="admin").first()
    if not admin_user:
        admin_user = User.objects.create(
            username="admin",
            email="admin@planscape.org",
            first_name="Admin",
            last_name="Planscape",
            is_staff=True,
            is_superuser=True,
        )

    def get_layer_by_name(name: str):
        layer = DataLayer.objects.filter(name__iexact=name).first()
        if not layer:
            raise RuntimeError(
                f"[add_wildfire_treatment_goals] DataLayer named '{name}' not found. "
                "Load/import your layers first, then re-run the migration."
            )
        return layer

    GOALS = [
        {
            "name": "Reduce Destructive Wildfire Risk to High-Density Housing",
            "category": "FIRE_DYNAMICS",
            "group": "WILDFIRE_RISK_TO_COMMUTIES",
            "description": (
                "Minimize the impact of destructive wildfire on areas with the highest housing density by targeting "
                "areas with high wildfire risk overlapping with communities containing the greatest number of homes.\n\n"
                "This scenario uses Housing Unit Risk as its priority objective."
            ),
            "layers": [
                ("PRIORITY", "Housing Unit Risk", None),
                ("SECONDARY_METRIC", "Risk to Potential Structures", None),
                ("SECONDARY_METRIC", "Wildfire Hazard Potential", None),
                ("SECONDARY_METRIC", "Annual Probability of Wildfire", None),
                ("SECONDARY_METRIC", "Conditional Flame Length", None),
                (
                    "SECONDARY_METRIC",
                    "Flame Length Exceedance Probability - 4 Feet",
                    None,
                ),
                (
                    "SECONDARY_METRIC",
                    "Flame Length Exceedance Probability - 8 Feet",
                    None,
                ),
            ],
        },
        {
            "name": "Reduce High-Severity Fire in the Wildland-Urban Interface (WUI)",
            "category": "FIRE_DYNAMICS",
            "group": "WILDFIRE_RISK_TO_COMMUTIES",
            "description": (
                "Reduce the risk of high-severity wildfire impacting homes and other important structures in or near "
                "the WUI by targeting areas with elevated risk to potential structures for risk mitigation treatments "
                "(e.g., fuel reduction, defensible space).\n\n"
                "This scenario uses Risk to Potential Structures as its priority objective and sets a stand level "
                "constraint that requires Community Wildfire Risk Reduction Zones to be categorized Direct Exposure."
            ),
            "layers": [
                ("PRIORITY", "Risk to Potential Structures", None),
                ("THRESHOLD", "Community Wildfire Risk Reduction Zones", "value == 2"),
                ("SECONDARY_METRIC", "Wildfire Hazard Potential", None),
                ("SECONDARY_METRIC", "Housing Unit Risk", None),
                ("SECONDARY_METRIC", "Annual Probability of Wildfire", None),
                ("SECONDARY_METRIC", "Conditional Flame Length", None),
                (
                    "SECONDARY_METRIC",
                    "Flame Length Exceedance Probability - 4 Feet",
                    None,
                ),
                (
                    "SECONDARY_METRIC",
                    "Flame Length Exceedance Probability - 8 Feet",
                    None,
                ),
            ],
        },
        {
            "name": "Reduce Destructive Wildfire Risk in the Viewshed",
            "category": "FIRE_DYNAMICS",
            "group": "WILDFIRE_RISK_TO_COMMUTIES",
            "description": (
                "Identify and prioritize treatment areas within the viewshed that experience destructive wildfire "
                "and pose challenges for suppression in areas with both high likelihood of destructive fire and "
                "suppression difficulty.\n\nThis scenario uses Wildfire Hazard Potential as its priority objective."
            ),
            "layers": [
                ("PRIORITY", "Wildfire Hazard Potential", None),
                ("SECONDARY_METRIC", "Risk to Potential Structures", None),
                ("SECONDARY_METRIC", "Housing Unit Risk", None),
                ("SECONDARY_METRIC", "Annual Probability of Wildfire", None),
                ("SECONDARY_METRIC", "Conditional Flame Length", None),
                (
                    "SECONDARY_METRIC",
                    "Flame Length Exceedance Probability - 4 Feet",
                    None,
                ),
                (
                    "SECONDARY_METRIC",
                    "Flame Length Exceedance Probability - 8 Feet",
                    None,
                ),
            ],
        },
    ]

    for spec in GOALS:
        tg_defaults = {
            "description": spec["description"],
            "category": spec["category"],
            "group": spec["group"],
            "active": True,
            "created_by_id": admin_user.id,
        }

        tg, created = TreatmentGoal.objects.get_or_create(
            name=spec["name"], defaults=tg_defaults
        )

        for field_name, value in tg_defaults.items():
            setattr(tg, field_name, value)

        tg.save(update_fields=list(tg_defaults.keys()))

        for usage_type, layer_name, threshold in spec["layers"]:
            datalayer = get_layer_by_name(layer_name)
            TGUD.objects.update_or_create(
                treatment_goal=tg,
                datalayer=datalayer,
                usage_type=usage_type,
                defaults={"threshold": threshold},
            )


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0046_alter_treatmentgoal_geometry"),
        ("datasets", "0019_datalayer_outline"),
    ]
    operations = [
        migrations.RunPython(add_wildfire_treatment_goals, migrations.RunPython.noop),
    ]
