from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0026_alter_planningareanote_planning_area_projectareanote"),
        ("impacts", "0008_alter_treatmentresult_value"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="treatmentresult",
            name="delta",
        ),
        migrations.AddField(
            model_name="treatmentresult",
            name="baseline",
            field=models.FloatField(null=True),
        ),
        migrations.CreateModel(
            name="ProjectAreaTreatmentResult",
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
                            ("CBD", "Crown Bulk Density"),
                            ("CBH", "Canopy Base Height"),
                            ("CC", "Canopy Cover"),
                            ("FBFM", "Fire Behavior/Fuel Model"),
                            ("LARGE_TREE_BIOMASS", "Large Tree Biomass"),
                            ("MERCH_BIOMASS", "Merch Biomass"),
                            ("MORTALITY", "Mortality"),
                            ("NON_MERCH_BIOMASS", "Non Merch Biomass"),
                            ("POTENTIAL_SMOKE", "Potential Smoke"),
                            ("PTORCH", "Probabiliy of Torching"),
                            ("QMD", "Quadratic Mean Diameter"),
                            ("SDI", "Stand Density Index"),
                            ("TH", "Total Height"),
                            ("TOT_FLAME_SEV", "Total Flame Severity"),
                            ("TOTAL_CARBON", "Total Carbon"),
                        ],
                        help_text="Impact Variable (choice).",
                    ),
                ),
                (
                    "aggregation",
                    models.CharField(
                        choices=[
                            ("SUM", "Sum"),
                            ("MEAN", "Mean"),
                            ("COUNT", "Count"),
                            ("MAX", "Max"),
                            ("MIN", "Min"),
                            ("MAJORITY", "Majority"),
                        ],
                        help_text="Impact Variable Aggregation (choice).",
                    ),
                ),
                (
                    "year",
                    models.IntegerField(
                        default=0, help_text="Number of year for the result."
                    ),
                ),
                (
                    "value",
                    models.FloatField(
                        help_text="Value extracted for the prescriptions inside this project area.",
                        null=True,
                    ),
                ),
                (
                    "baseline",
                    models.FloatField(
                        help_text="Baseline value extract from the prescriptions inside this project area."
                    ),
                ),
                (
                    "type",
                    models.CharField(
                        choices=[("DIRECT", "Direct"), ("INDIRECT", "Indirect")],
                        default="DIRECT",
                        help_text="Type of Treatment Result (choice).",
                    ),
                ),
                (
                    "project_area",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="project_area_results",
                        to="planning.projectarea",
                    ),
                ),
                (
                    "treatment_plan",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="project_area_results",
                        to="impacts.treatmentplan",
                    ),
                ),
            ],
        ),
        migrations.AddConstraint(
            model_name="projectareatreatmentresult",
            constraint=models.UniqueConstraint(
                fields=(
                    "treatment_plan",
                    "project_area",
                    "variable",
                    "aggregation",
                    "year",
                ),
                name="project_area_treatment_result_unique_constraint",
            ),
        ),
    ]
