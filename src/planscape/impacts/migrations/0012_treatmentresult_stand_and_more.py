from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("stands", "0008_standmetric_datalayer_alter_standmetric_condition"),
        (
            "impacts",
            "0011_remove_treatmentresult_treatment_result_unique_constraint_and_more",
        ),
    ]

    operations = [
        migrations.AddField(
            model_name="treatmentresult",
            name="stand",
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.RESTRICT,
                related_name="tx_results",
                to="stands.stand",
            ),
        ),
        migrations.AlterField(
            model_name="projectareatreatmentresult",
            name="aggregation",
            field=models.CharField(
                choices=[
                    ("SUM", "Sum"),
                    ("MEAN", "Mean"),
                    ("COUNT", "Count"),
                    ("MAX", "Max"),
                    ("MIN", "Min"),
                    ("MAJORITY", "Majority"),
                    ("MINORITY", "Minority"),
                ],
                help_text="Impact Variable Aggregation (choice).",
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
                    ("MINORITY", "Minority"),
                ],
                help_text="Impact Variable Aggregation (choice).",
            ),
        ),
    ]
