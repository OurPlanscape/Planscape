from django.conf import settings
import django.contrib.gis.db.models.fields
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        (
            "planning",
            "0024_alter_planningarea_geometry_alter_planningarea_name_and_more",
        ),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("stands", "0007_alter_stand_created_at_alter_standmetric_created_at"),
        ("impacts", "0004_treatmentresult_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="treatmentplan",
            name="created_by",
            field=models.ForeignKey(
                help_text="User ID that created Treatment Plan.",
                on_delete=django.db.models.deletion.RESTRICT,
                related_name="tx_plans",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="treatmentplan",
            name="name",
            field=models.CharField(help_text="Name of Treatment Plan.", max_length=256),
        ),
        migrations.AlterField(
            model_name="treatmentplan",
            name="scenario",
            field=models.ForeignKey(
                help_text="Scenario ID.",
                on_delete=django.db.models.deletion.RESTRICT,
                related_name="tx_plans",
                to="planning.scenario",
            ),
        ),
        migrations.AlterField(
            model_name="treatmentplan",
            name="status",
            field=models.CharField(
                choices=[
                    ("PENDING", "Pending"),
                    ("RUNNING", "Running"),
                    ("SUCCESS", "Suceess"),
                    ("FAILURE", "Failure"),
                ],
                default="PENDING",
                help_text="Status of Treatment Plan (choice).",
            ),
        ),
        migrations.AlterField(
            model_name="treatmentprescription",
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
                help_text="Action of Treatment Prescription (choice).",
            ),
        ),
        migrations.AlterField(
            model_name="treatmentprescription",
            name="created_by",
            field=models.ForeignKey(
                help_text="User ID that created Treatment Prescription.",
                on_delete=django.db.models.deletion.RESTRICT,
                related_name="created_tx_prescriptions",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="treatmentprescription",
            name="geometry",
            field=django.contrib.gis.db.models.fields.PolygonField(
                help_text="Geometry of the Treatment Prescription.", srid=4269
            ),
        ),
        migrations.AlterField(
            model_name="treatmentprescription",
            name="project_area",
            field=models.ForeignKey(
                help_text="Project Area ID.",
                on_delete=django.db.models.deletion.RESTRICT,
                related_name="tx_prescriptions",
                to="planning.projectarea",
            ),
        ),
        migrations.AlterField(
            model_name="treatmentprescription",
            name="stand",
            field=models.ForeignKey(
                help_text="Stand which Treatment Prescription will be applied.",
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="tx_prescriptions",
                to="stands.stand",
            ),
        ),
        migrations.AlterField(
            model_name="treatmentprescription",
            name="treatment_plan",
            field=models.ForeignKey(
                help_text="Treatment Plan ID.",
                null=True,
                on_delete=django.db.models.deletion.RESTRICT,
                related_name="tx_prescriptions",
                to="impacts.treatmentplan",
            ),
        ),
        migrations.AlterField(
            model_name="treatmentprescription",
            name="type",
            field=models.CharField(
                choices=[("SINGLE", "Single"), ("SEQUENCE", "Sequence")],
                default="SINGLE",
                help_text="Type of Treatment Prescription (choice).",
            ),
        ),
        migrations.AlterField(
            model_name="treatmentprescription",
            name="updated_by",
            field=models.ForeignKey(
                help_text="User ID that updated Treatment Prescription.",
                on_delete=django.db.models.deletion.RESTRICT,
                related_name="updated_tx_prescriptions",
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AlterField(
            model_name="treatmentresult",
            name="aggregation",
            field=models.CharField(
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
        migrations.AlterField(
            model_name="treatmentresult",
            name="treatment_plan",
            field=models.ForeignKey(
                help_text="Treatment Plan ID.",
                on_delete=django.db.models.deletion.RESTRICT,
                related_name="results",
                to="impacts.treatmentplan",
            ),
        ),
        migrations.AlterField(
            model_name="treatmentresult",
            name="treatment_prescription",
            field=models.ForeignKey(
                help_text="Treatment Prescription ID.",
                on_delete=django.db.models.deletion.RESTRICT,
                related_name="results",
                to="impacts.treatmentprescription",
            ),
        ),
        migrations.AlterField(
            model_name="treatmentresult",
            name="variable",
            field=models.CharField(
                choices=[
                    ("CBD", "Crown Bulk Density"),
                    ("CBH", "Canopy Base Height"),
                    ("CC", "Canopy Cover"),
                    ("FBFM", "Fuel Bed/Fuel Model"),
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
        migrations.AlterField(
            model_name="treatmentresult",
            name="year",
            field=models.IntegerField(
                default=0, help_text="Number of year for the result."
            ),
        ),
    ]
