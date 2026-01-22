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


def add_treemap_fvs_2020_treatment_goal(apps, schema_editor):
    TreatmentGoal = apps.get_model("planning", "TreatmentGoal")
    TGUD = apps.get_model("planning", "TreatmentGoalUsesDataLayer")
    DataLayer = apps.get_model("datasets", "DataLayer")
    User = apps.get_model("auth", "User")

    goal = {
        "name": "Prioritize Areas with High Total Live Tree Volume and High Wildfire Hazard Potential",
        "description": (
            "Identify and prioritize areas where high total live tree volume coincides with elevated "
            "wildfire hazard potential. This goal focuses on locations where substantial existing timber "
            "volume occurs in areas characterized by higher wildfire likelihood and potential fire behavior."
        ),
        "category": "CARBON_BIOMASS",
        "group": "TREEMAP_FVS_2020",
        "layers": [
            # Priority Objectives
            {
                "usage_type": "PRIORITY",
                "dataset": "Wildfire Risk to Communities",
                "layer": "Wildfire Hazard Potential",
                "threshold": None,
            },
            {
                "usage_type": "PRIORITY",
                "dataset": "TreeMap FVS 2020",
                "layer": "Total Live Tree Volume",
                "threshold": None,
            },
            # Co-Benefits
            {
                "usage_type": "SECONDARY_METRIC",
                "dataset": "Wildfire Risk to Communities",
                "layer": "Housing Unit Risk",
                "threshold": None,
            },
            {
                "usage_type": "SECONDARY_METRIC",
                "dataset": "Wildfire Risk to Communities",
                "layer": "Wildfire Hazard Potential",
                "threshold": None,
            },
            {
                "usage_type": "SECONDARY_METRIC",
                "dataset": "TreeMap FVS 2020",
                "layer": "Total Live Tree Volume",
                "threshold": None,
            },
            {
                "usage_type": "SECONDARY_METRIC",
                "dataset": "TreeMap FVS 2020",
                "layer": "Expected Annual Total Volume Killed",
                "threshold": None,
            },
            # Stand-Level Constraints
            {
                "usage_type": "THRESHOLD",
                "dataset": "TreeMap FVS 2020",
                "layer": "Total Live Tree Volume",
                "threshold": "value > 77.84",
            },
            {
                "usage_type": "THRESHOLD",
                "dataset": "Wildfire Risk to Communities",
                "layer": "Wildfire Hazard Potential",
                "threshold": "value > 0",
            },
        ],
    }

    admin_user = get_or_create_admin(User)

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
        ("planning", "0075_recalculate_planningarea_capabilities"),
        ("datasets", "0026_dataset_modules"),
    ]

    operations = [
        migrations.RunPython(
            add_treemap_fvs_2020_treatment_goal, migrations.RunPython.noop
        ),
    ]
