from django.db import migrations


def get_layer(DataLayer, layer_name: str):
    """
    Find the data layer by name, case-insensitive.
    """
    return DataLayer.objects.filter(name__iexact=layer_name).order_by("id").first()


def get_treatment_goal(TreatmentGoal, tg_name: str):
    """
    Find the treatment goal by name, case-insensitive, ignoring soft-deleted rows.
    """
    return (
        TreatmentGoal.objects.filter(name__iexact=tg_name, deleted_at=None)
        .order_by("id")
        .first()
    )


def upsert_usage(
    tg_datalayer_usage, tg, datalayer, usage_type: str, threshold=None, weight=None
):
    """
    Create or update the TreatmentGoalUsesDataLayer row (ignores soft-deleted rows).
    Updates threshold and/or weight if provided.
    """
    obj = (
        tg_datalayer_usage.objects.filter(
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

        if threshold is not None and obj.threshold != threshold:
            obj.threshold = threshold
            update_fields.append("threshold")

        if weight is not None and obj.weight != weight:
            obj.weight = weight
            update_fields.append("weight")

        if update_fields:
            obj.save(update_fields=update_fields)
        return

    tg_datalayer_usage.objects.create(
        treatment_goal=tg,
        datalayer=datalayer,
        usage_type=usage_type,
        threshold=threshold,
        weight=weight,
    )


def update_priority_objective_weights(apps, schema_editor):
    TreatmentGoal = apps.get_model("planning", "TreatmentGoal")
    tg_datalayer_usage = apps.get_model("planning", "TreatmentGoalUsesDataLayer")
    DataLayer = apps.get_model("datasets", "DataLayer")

    goals = [
        {
            "name": "Prioritize Areas with High-Intensity Fire Probability and Wildlife Species Richness",
            "priority_layers": [
                {"layer": "Wildlife Species Richness", "weight": 2},
                {"layer": "Probability of Fire Severity - High", "weight": 1},
            ],
        },
        {
            "name": "Prioritize Areas with High-Intensity Fire Probability and Threatened & Endangered Species Richness",
            "priority_layers": [
                {
                    "layer": "Threatened/Endangered Vertebrate Species Richness",
                    "weight": 2,
                },
                {"layer": "Probability of Fire Severity - High", "weight": 1},
            ],
        },
    ]

    for goal in goals:
        tg = get_treatment_goal(TreatmentGoal, goal["name"])
        if not tg:
            print(f"[weights migration] Missing TreatmentGoal: {goal['name']}")
            continue

        for spec in goal["priority_layers"]:
            datalayer = get_layer(DataLayer, spec["layer"])
            if not datalayer:
                print(f"[weights migration] Missing DataLayer: {spec['layer']}")
                continue

            upsert_usage(
                tg_datalayer_usage,
                tg,
                datalayer,
                usage_type="PRIORITY",
                threshold=None,
                weight=spec["weight"],
            )


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0079_scenario_planning_approach_and_more"),
        ("datasets", "0026_dataset_modules"),
    ]

    operations = [
        migrations.RunPython(
            update_priority_objective_weights, migrations.RunPython.noop
        ),
    ]
