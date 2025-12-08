from django.db import migrations


def strip_geometry_from_results(apps, schema_editor):
    ScenarioResult = apps.get_model("planning", "ScenarioResult")
    SCENARIO_BATCH_SIZE = 200

    qs = ScenarioResult.objects.exclude(result__isnull=True)
    for scenario_result in qs.iterator(chunk_size=SCENARIO_BATCH_SIZE):
        result = scenario_result.result or {}
        features = result.get("features") or []
        cleaned_features = []
        for feature in features:
            if not isinstance(feature, dict):
                continue
            feature.pop("geometry", None)
            cleaned_features.append(feature)
        result["features"] = cleaned_features
        scenario_result.result = result
        scenario_result.save(update_fields=["result"])


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0067_alter_scenario_ready_email_sent_at"),
    ]

    operations = [
        migrations.RunPython(
            strip_geometry_from_results, migrations.RunPython.noop, atomic=False
        ),
    ]
