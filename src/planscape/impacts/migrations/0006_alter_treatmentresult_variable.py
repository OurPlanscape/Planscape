from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("impacts", "0005_alter_treatmentplan_created_by_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="treatmentresult",
            name="variable",
            field=models.CharField(
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
    ]
