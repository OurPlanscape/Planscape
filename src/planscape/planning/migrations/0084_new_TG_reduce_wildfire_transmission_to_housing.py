from django.contrib.gis.geos import MultiPolygon
from django.db import migrations


def get_or_create_admin(User):
    admin_user, _ = User.objects.get_or_create(
        username="admin",
        defaults={
            "email": "admin@planscape.org",
            "first_name": "Admin",
            "last_name": "Planscape",
            "is_staff": True,
            "is_superuser": True,
        },
    )
    return admin_user


def get_layer(DataLayer, dataset_name: str, layer_name: str):
    """
    Find the data layer by dataset name and data layer name, case-insensitive.
    """
    return (
        DataLayer.objects.filter(
            name__iexact=layer_name,
            dataset__name__iexact=dataset_name,
        )
        .order_by("id")
        .first()
    )


def normalize_to_multipolygon(geom, label: str):
    """
    Normalizes datalayer geometry to multipolygon, needed for geometry field.
    """
    if geom is None:
        return None

    if geom.geom_type == "Polygon":
        return MultiPolygon(geom)

    if geom.geom_type == "MultiPolygon":
        return geom

    raise RuntimeError(f"Unexpected geometry type for {label}: {geom.geom_type}")


def get_tg_geometry_from_referenced_layers(DataLayer, layer_specs):
    """
    Grabs any one of the tg's layers' geometry (assumes data layers share same geometry).
    """
    for spec in layer_specs:
        dataset_name = spec["dataset"]
        layer_name = spec["layer"]
        datalayer = get_layer(DataLayer, dataset_name, layer_name)
        if datalayer and datalayer.geometry:
            return normalize_to_multipolygon(
                datalayer.geometry,
                label=f"{dataset_name} / {layer_name}",
            )
    return None


def upsert_treatment_goal(TreatmentGoal, admin_user_id: int, goal: dict, geom_source):
    """
    Create the TreatmentGoal if missing, otherwise update it.
    """
    tg_defaults = {
        "description": goal["description"],
        "category": goal["category"],
        "group": goal["group"],
        "active": True,
        "created_by_id": admin_user_id,
    }

    tg, _created = TreatmentGoal.objects.get_or_create(
        name=goal["name"], defaults=tg_defaults
    )

    for field_name, value in tg_defaults.items():
        setattr(tg, field_name, value)

    update_fields = list(tg_defaults.keys())

    if geom_source is not None:
        geom = geom_source.clone()
        if getattr(tg, "geometry", None):
            geom.srid = tg.geometry.srid
        tg.geometry = geom
        update_fields.append("geometry")

    tg.save(update_fields=update_fields)
    return tg


def upsert_usage(TGUD, tg, datalayer, usage_type: str, threshold):
    """
    Create or update the TreatmentGoalUsesDataLayer row (ignores soft-deleted rows).
    """
    obj = (
        TGUD.objects.filter(
            treatment_goal=tg,
            datalayer=datalayer,
            usage_type=usage_type,
            deleted_at=None,
        )
        .order_by("id")
        .first()
    )

    if obj:
        if obj.threshold != threshold:
            obj.threshold = threshold
            obj.save(update_fields=["threshold"])
        return

    TGUD.objects.create(
        treatment_goal=tg,
        datalayer=datalayer,
        usage_type=usage_type,
        threshold=threshold,
    )


def add_riskmonitor_transmission_to_housing_treatment_goal(apps, schema_editor):
    TreatmentGoal = apps.get_model("planning", "TreatmentGoal")
    TGUD = apps.get_model("planning", "TreatmentGoalUsesDataLayer")
    DataLayer = apps.get_model("datasets", "DataLayer")
    User = apps.get_model("auth", "User")

    goal = {
        "name": (
            "Prioritize treatments in areas where there is the greatest opportunity "
            "to reduce wildfire transmission to Housing"
        ),
        "description": (
            "Prioritize treatments in areas where there is the greatest opportunity to "
            "reduce wildfire transmission to housing."
        ),
        "category": "FIRE_DYNAMICS",
        "group": "RISK_BASED_STRATEGIC_PLANNING",
        "layers": [
            # Priority Objective
            {
                "usage_type": "PRIORITY",
                "dataset": "RiskMonitor",
                "layer": "Exposure Mitigation Index",
                "threshold": None,
            },
            # Co-Benefits
            {
                "usage_type": "SECONDARY_METRIC",
                "dataset": "RiskMonitor",
                "layer": "No Treatment cNVC Water",
                "threshold": None,
            },
            {
                "usage_type": "SECONDARY_METRIC",
                "dataset": "RiskMonitor",
                "layer": "No Treatment cNVC Housing",
                "threshold": None,
            },
            {
                "usage_type": "SECONDARY_METRIC",
                "dataset": "RiskMonitor",
                "layer": "No Treatment cNVC CommSites",
                "threshold": None,
            },
            {
                "usage_type": "SECONDARY_METRIC",
                "dataset": "RiskMonitor",
                "layer": "No Treatment cNVC Powerlines",
                "threshold": None,
            },
            {
                "usage_type": "SECONDARY_METRIC",
                "dataset": "RiskMonitor",
                "layer": "No Treatment SourceExp Housing Units",
                "threshold": None,
            },
            # Stand-Level Constraint
            {
                "usage_type": "THRESHOLD",
                "dataset": "RiskMonitor",
                "layer": "Exposure Mitigation Index",
                "threshold": "value > 0",
            },
        ],
    }

    admin_user = get_or_create_admin(User)

    existing_tg = (
        TreatmentGoal.objects.filter(
            group="RISK_BASED_STRATEGIC_PLANNING",
            geometry__isnull=False,
            deleted_at=None,
        )
        .order_by("id")
        .first()
    )
    geom_source = (
        normalize_to_multipolygon(existing_tg.geometry, "existing RiskMonitor TG")
        if existing_tg
        else None
    )

    if geom_source is None:
        geom_source = get_tg_geometry_from_referenced_layers(DataLayer, goal["layers"])

    tg = upsert_treatment_goal(
        TreatmentGoal=TreatmentGoal,
        admin_user_id=admin_user.id,
        goal=goal,
        geom_source=geom_source,
    )

    for spec in goal["layers"]:
        datalayer = get_layer(DataLayer, spec["dataset"], spec["layer"])
        if not datalayer:
            print(
                f"[TreatmentGoal migration] Missing DataLayer: {spec['dataset']} / {spec['layer']}"
            )
            continue

        upsert_usage(
            TGUD,
            tg,
            datalayer,
            spec["usage_type"],
            spec["threshold"],
        )


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0083_alter_scenario_planning_approach"),
        ("datasets", "0026_dataset_modules"),
    ]

    operations = [
        migrations.RunPython(
            add_riskmonitor_transmission_to_housing_treatment_goal,
            migrations.RunPython.noop,
        ),
    ]
