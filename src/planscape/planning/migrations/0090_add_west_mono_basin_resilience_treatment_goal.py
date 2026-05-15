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
            deleted_at=None,
            dataset__deleted_at=None,
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


def get_tg_geometry_from_layer_preferences(DataLayer, layer_preferences):
    """
    Picks geometry from preferred referenced layers first.
    """
    for spec in layer_preferences:
        dataset_name = spec["dataset"]
        layer_name = spec["layer"]
        datalayer = get_layer(DataLayer, dataset_name, layer_name)

        if datalayer and datalayer.geometry:
            return normalize_to_multipolygon(
                datalayer.geometry,
                label=f"{dataset_name} / {layer_name}",
            )

        print(
            f"[TreatmentGoal migration] Missing geometry source DataLayer: "
            f"{dataset_name} / {layer_name}"
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
        name=goal["name"],
        defaults=tg_defaults,
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


def upsert_usage(TGUD, tg, datalayer, usage_type: str, threshold, weight=None):
    """
    Create or update the TreatmentGoalUsesDataLayer row.
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
        update_fields = []

        if obj.threshold != threshold:
            obj.threshold = threshold
            update_fields.append("threshold")

        if obj.weight != weight:
            obj.weight = weight
            update_fields.append("weight")

        if update_fields:
            obj.save(update_fields=update_fields)

        return

    TGUD.objects.create(
        treatment_goal=tg,
        datalayer=datalayer,
        usage_type=usage_type,
        threshold=threshold,
        weight=weight,
    )


def add_west_mono_basin_resilience_treatment_goal(apps, schema_editor):
    TreatmentGoal = apps.get_model("planning", "TreatmentGoal")
    TGUD = apps.get_model("planning", "TreatmentGoalUsesDataLayer")
    DataLayer = apps.get_model("datasets", "DataLayer")
    User = apps.get_model("auth", "User")

    goal = {
        "name": "Target Wildfire Hazard Potential in Sage Grouse Habitat",
        "description": (
            "Target wildfire hazard potential in sage grouse habitat for the "
            "West Mono Basin Resilience planning effort."
        ),
        "category": "FIRE_DYNAMICS",
        "group": "WEST_MONO_BASIN_RESILIENCE",
        "layers": [
            # Priority Objective
            {
                "usage_type": "PRIORITY",
                "dataset": "Wildfire Risk to Communities",
                "layer": "Wildfire Hazard Potential",
                "threshold": None,
                "weight": 1,
            },
            # Stand-Level Constraints
            {
                "usage_type": "THRESHOLD",
                "dataset": "West Mono Basin Resilience",
                "layer": "Leks Buffer Zone (0.6–5 Miles)",
                "threshold": "value == 1",
                "weight": None,
            },
            {
                "usage_type": "THRESHOLD",
                "dataset": "West Mono Basin Resilience",
                "layer": "Sage-grouse Suitable Nesting Habitat",
                "threshold": "value != 1",
                "weight": None,
            },
            {
                "usage_type": "THRESHOLD",
                "dataset": "West Mono Basin Resilience",
                "layer": "Non-native Invasive Grasses",
                "threshold": "value < 20",
                "weight": None,
            },
            {
                "usage_type": "THRESHOLD",
                "dataset": "West Mono Basin Resilience",
                "layer": "Sagebrush Cover",
                "threshold": "value > 40",
                "weight": None,
            },
        ],
    }

    geometry_layer_preferences = [
        {
            "dataset": "West Mono Basin Resilience",
            "layer": "Non-native Invasive Grasses",
        },
        {
            "dataset": "West Mono Basin Resilience",
            "layer": "Sagebrush Cover",
        },
        {
            "dataset": "West Mono Basin Resilience",
            "layer": "Sage-grouse Suitable Nesting Habitat",
        },
        {
            "dataset": "West Mono Basin Resilience",
            "layer": "Leks Buffer Zone (0.6–5 Miles)",
        },
    ]

    admin_user = get_or_create_admin(User)

    geom_source = get_tg_geometry_from_layer_preferences(
        DataLayer,
        geometry_layer_preferences,
    )

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
                f"[TreatmentGoal migration] Missing DataLayer: "
                f"{spec['dataset']} / {spec['layer']}"
            )
            continue

        upsert_usage(
            TGUD,
            tg,
            datalayer,
            spec["usage_type"],
            spec["threshold"],
            spec["weight"],
        )


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0089_add_west_mono_basin_resilience_treatment_goal_group"),
        ("datasets", "0028_dataset_style_datalayer_workspace"),
    ]

    operations = [
        migrations.RunPython(
            add_west_mono_basin_resilience_treatment_goal,
            migrations.RunPython.noop,
        ),
    ]
