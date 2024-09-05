from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        (
            "impacts",
            "0003_treatmentprescription_treatment_prescription_treatment_plan_unique_constraint",
        ),
    ]

    operations = [
        migrations.CreateModel(
            name="TreatmentResult",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True, null=True)),
                (
                    "deleted_at",
                    models.DateTimeField(
                        help_text="Define if the entity has been deleted or not and when",
                        null=True,
                        verbose_name="Deleted at",
                    ),
                ),
                (
                    "variable",
                    models.CharField(
                        choices=[
                            ("CROWN_BULK_DENSITY", "Crown Bulk DEnsity"),
                            ("CANOPY_BASE_HEIGHT", "Canopy Base Height"),
                            ("CANOPY_COVER", "Canopy Cover"),
                            ("FUEL_BED_FUEL_MODEL", "Fuel Bed/Fuel Model"),
                            ("LARGE_TREE_BIOMASS", "Large Tree Biomass"),
                            ("MERCH_BIOMASS", "Merch Biomass"),
                            ("MORTALITY", "Mortality"),
                            ("NON_MERCH_BIOMASS", "Non Merch Biomass"),
                            ("POTENTIAL_SMOKE", "Potential Smoke"),
                            ("PROBABILITY_TORCHING", "Probabiliy of Torching"),
                            ("QUADRATIC_MEAN_DIAMETER", "Quadratic Mean Diameter"),
                            ("STAND_DENSITY_INDEX", "Stand Density Index"),
                            ("TOTAL_HEIGHT", "Total Height"),
                            ("TOTAL_FLAME_SEVERITY", "Total Flame Severity"),
                            ("TOTAL_CARBON", "Total Carbon"),
                            (
                                "{('CROWN_BULK_DENSITY', 'Crown Bulk DEnsity'): [ImpactVariableAggregation.MEAN], ('CANOPY_BASE_HEIGHT', 'Canopy Base Height'): [ImpactVariableAggregation.MEAN], ('CANOPY_COVER', 'Canopy Cover'): [ImpactVariableAggregation.MEAN], ('FUEL_BED_FUEL_MODEL', 'Fuel Bed/Fuel Model'): [], ('LARGE_TREE_BIOMASS', 'Large Tree Biomass'): [ImpactVariableAggregation.SUM, ImpactVariableAggregation.MEAN], ('MERCH_BIOMASS', 'Merch Biomass'): [ImpactVariableAggregation.SUM, ImpactVariableAggregation.MEAN], ('MORTALITY', 'Mortality'): [], ('NON_MERCH_BIOMASS', 'Non Merch Biomass'): [ImpactVariableAggregation.SUM, ImpactVariableAggregation.MEAN], ('POTENTIAL_SMOKE', 'Potential Smoke'): [ImpactVariableAggregation.SUM, ImpactVariableAggregation.MEAN], ('PROBABILITY_TORCHING', 'Probabiliy of Torching'): [ImpactVariableAggregation.MEAN], ('QUADRATIC_MEAN_DIAMETER', 'Quadratic Mean Diameter'): [ImpactVariableAggregation.MEAN], ('STAND_DENSITY_INDEX', 'Stand Density Index'): [ImpactVariableAggregation.MEAN], ('TOTAL_HEIGHT', 'Total Height'): [ImpactVariableAggregation.MEAN], ('TOTAL_FLAME_SEVERITY', 'Total Flame Severity'): [ImpactVariableAggregation.MEAN], ('TOTAL_CARBON', 'Total Carbon'): [ImpactVariableAggregation.SUM, ImpactVariableAggregation.MEAN]}",
                                "Aggregations",
                            ),
                        ]
                    ),
                ),
                (
                    "aggregation",
                    models.CharField(
                        choices=[("SUM", "Sum"), ("MEAN", "Mean"), ("COUNT", "Count")]
                    ),
                ),
                ("year", models.IntegerField(default=0)),
                (
                    "value",
                    models.FloatField(
                        help_text="Value extracted for the prescription stand, based on variable, year and variable aggreation type."
                    ),
                ),
                (
                    "delta",
                    models.FloatField(
                        help_text="Delta between this years value and base year value. From 0-1, null for base years.",
                        null=True,
                    ),
                ),
                (
                    "treatment_plan",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="results",
                        to="impacts.treatmentplan",
                    ),
                ),
                (
                    "treatment_prescription",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="results",
                        to="impacts.treatmentprescription",
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="treatmentresult",
            constraint=models.UniqueConstraint(
                fields=("treatment_prescription", "variable", "aggregation", "year"),
                name="treatment_result_unique_constraint",
            ),
        ),
    ]
