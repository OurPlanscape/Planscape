from django.contrib.gis.geos import MultiPolygon
from django.db import migrations


def add_riskmonitor_treatment_goals(apps, schema_editor):
    TreatmentGoal = apps.get_model("planning", "TreatmentGoal")
    TGUD = apps.get_model("planning", "TreatmentGoalUsesDataLayer")
    DataLayer = apps.get_model("datasets", "DataLayer")
    User = apps.get_model("auth", "User")

    dataset_name = "RiskMonitor"
    group_name = "RISK_BASED_STRATEGIC_PLANNING"

    admin_user = User.objects.filter(username="admin").first()
    if not admin_user:
        admin_user = User.objects.filter(is_superuser=True).order_by("id").first()
    if not admin_user:
        admin_user = User.objects.create(
            username="admin",
            email="admin@planscape.org",
            first_name="Admin",
            last_name="Planscape",
            is_staff=True,
            is_superuser=True,
        )

    def get_layer_by_name_and_dataset(name: str, dataset_name: str):
        layer = DataLayer.objects.filter(
            name__iexact=name, dataset__name__iexact=dataset_name
        ).first()
        return layer if layer else None

    geom_source_layer = (
        DataLayer.objects.filter(dataset__name__iexact=dataset_name)
        .exclude(geometry__isnull=True)
        .order_by("id")
        .first()
    )

    geom_source = geom_source_layer.geometry if geom_source_layer else None
    if geom_source is not None:
        if geom_source.geom_type == "Polygon":
            geom_source = MultiPolygon(geom_source)
        elif geom_source.geom_type != "MultiPolygon":
            raise RuntimeError(
                f"Unexpected geometry type for RiskMonitor layers: {geom_source.geom_type}"
            )

    CO_BENEFITS = [
        "No Treatment cNVC Water",
        "No Treatment cNVC Housing",
        "No Treatment cNVC CommSites",
        "No Treatment cNVC Powerlines",
        "No Treatment SourceExp Housing Units",
    ]

    GOALS = [
        {
            "name": "Risk to Surface Drinking Water",
            "category": "FIRE_DYNAMICS",
            "group": group_name,
            "description": (
                "Prioritize treatments in areas where there is the greatest opportunity to "
                "reduce wildfire-related risk to Surface Drinking Water"
            ),
            "layers": (
                [("PRIORITY", "Delta cNVC Water", None)]
                + [("SECONDARY_METRIC", n, None) for n in CO_BENEFITS]
                + [("THRESHOLD", "Delta cNVC Water", "value > 0")]
            ),
        },
        {
            "name": "Risk to Housing",
            "category": "FIRE_DYNAMICS",
            "group": group_name,
            "description": (
                "Prioritize treatments in areas where there is the greatest opportunity to "
                "reduce wildfire-related risk to Housing"
            ),
            "layers": (
                [("PRIORITY", "Delta cNVC Housing", None)]
                + [("SECONDARY_METRIC", n, None) for n in CO_BENEFITS]
                + [("THRESHOLD", "Delta cNVC Housing", "value > 0")]
            ),
        },
        {
            "name": "Risk to Infrastructure",
            "category": "FIRE_DYNAMICS",
            "group": group_name,
            "description": (
                "Prioritize treatments in areas where there is the greatest opportunity to "
                "reduce wildfire-related risk to Infrastructure"
            ),
            "layers": (
                [
                    ("PRIORITY", "Delta cNVC CommSites", None),
                    ("PRIORITY", "Delta cNVC Powerlines", None),
                ]
                + [("SECONDARY_METRIC", n, None) for n in CO_BENEFITS]
                + [
                    ("THRESHOLD", "Delta cNVC CommSites", "value > 0"),
                    ("THRESHOLD", "Delta cNVC Powerlines", "value > 0"),
                ]
            ),
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

        tg, _created = TreatmentGoal.objects.get_or_create(
            name=spec["name"], defaults=tg_defaults
        )

        for field_name, value in tg_defaults.items():
            setattr(tg, field_name, value)

        if geom_source is not None:
            if getattr(tg, "geometry", None):
                geom_source.srid = tg.geometry.srid
            tg.geometry = geom_source

            tg.save(update_fields=list(tg_defaults.keys()) + ["geometry"])
        else:
            tg.save(update_fields=list(tg_defaults.keys()))

        for usage_type, layer_name, threshold in spec["layers"]:
            datalayer = get_layer_by_name_and_dataset(layer_name, dataset_name)
            if not datalayer:
                continue

            existing_qs = TGUD.objects.filter(
                treatment_goal=tg,
                datalayer=datalayer,
                usage_type=usage_type,
                deleted_at=None,
            )

            obj = existing_qs.first()
            if obj:
                if obj.threshold != threshold:
                    obj.threshold = threshold
                    obj.save(update_fields=["threshold"])
            else:
                TGUD.objects.create(
                    treatment_goal=tg,
                    datalayer=datalayer,
                    usage_type=usage_type,
                    threshold=threshold,
                )


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0070_add_risk_based_strategic_planning_tgg"),
        ("datasets", "0026_dataset_modules"),
    ]

    operations = [
        migrations.RunPython(
            add_riskmonitor_treatment_goals, migrations.RunPython.noop
        ),
    ]
