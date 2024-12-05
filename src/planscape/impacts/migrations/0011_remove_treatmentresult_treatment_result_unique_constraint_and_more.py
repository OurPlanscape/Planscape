from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("impacts", "0010_alter_projectareatreatmentresult_variable_and_more"),
    ]

    operations = [
        migrations.RemoveConstraint(
            model_name="treatmentresult",
            name="treatment_result_unique_constraint",
        ),
        migrations.RemoveField(
            model_name="treatmentresult",
            name="treatment_prescription",
        ),
        migrations.AddField(
            model_name="treatmentresult",
            name="action",
            field=models.CharField(
                choices=[
                    (
                        "MODERATE_THINNING_BIOMASS",
                        "Moderate Thinning & Biomass Removal",
                    ),
                    ("HEAVY_THINNING_BIOMASS", "Heavy Thinning & Biomass Removal"),
                    ("MODERATE_THINNING_BURN", "Moderate Thinning & Pile Burn"),
                    ("HEAVY_THINNING_BURN", "Heavy Thinning & Pile Burn"),
                    ("MODERATE_MASTICATION", "Moderate Mastication"),
                    ("HEAVY_MASTICATION", "Heavy Mastication"),
                    ("RX_FIRE", "Prescribed Fire"),
                    ("HEAVY_THINNING_RX_FIRE", "Heavy Thinning & Prescribed Fire"),
                    ("MASTICATION_RX_FIRE", "Mastication & Prescribed Fire"),
                    (
                        "MODERATE_THINNING_BURN_PLUS_RX_FIRE",
                        "Moderate Thinning & Pile Burn (year 0), Prescribed Burn (year 10)",
                    ),
                    (
                        "MODERATE_THINNING_BURN_PLUS_MODERATE_THINNING_BURN",
                        "Moderate Thinning & Pile Burn (year 0), Moderate Thinning & Pile Burn (year 10)",
                    ),
                    (
                        "HEAVY_THINNING_BURN_PLUS_RX_FIRE",
                        "Heavy Thinning & Pile Burn (year 0), Prescribed Burn (year 10)",
                    ),
                    (
                        "HEAVY_THINNING_BURN_PLUS_HEAVY_THINNING_BURN",
                        "Heavy Thinning & Pile Burn (year 0), Heavy Thinning & Pile Burn (year 10)",
                    ),
                    (
                        "RX_FIRE_PLUS_RX_FIRE",
                        "Prescribed Fire (year 0), Prescribed Fire (year 10)",
                    ),
                    (
                        "MODERATE_MASTICATION_PLUS_MODERATE_MASTICATION",
                        "Moderate Mastication (year 0), Moderate Mastication (year 10)",
                    ),
                    (
                        "HEAVY_THINNING_BIOMASS_PLUS_RX_FIRE",
                        "Heavy Thinning & Biomass Removal (year 0), Prescribed Fire (year 10)",
                    ),
                    (
                        "MODERATE_MASTICATION_PLUS_RX_FIRE",
                        "Moderate Mastication (year 0), Prescribed Fire (year 10)",
                    ),
                ],
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="treatmentresult",
            name="delta",
            field=models.FloatField(null=True),
        ),
        migrations.AddConstraint(
            model_name="treatmentresult",
            constraint=models.UniqueConstraint(
                fields=("treatment_plan", "variable", "action", "year", "aggregation"),
                name="treatment_result_unique_constraint",
            ),
        ),
    ]
