from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("datasets", "0014_remove_category_deleted_at"),
        ("planning", "0033_auto_20250414_1631"),
    ]

    operations = [
        migrations.AddField(
            model_name="treatmentgoal",
            name="datalayers",
            field=models.ManyToManyField(
                through="planning.TreatmentGoalUsesDataLayer", to="datasets.datalayer"
            ),
        ),
        migrations.AlterField(
            model_name="treatmentgoalusesdatalayer",
            name="datalayer",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="used_by_treatment_goals",
                to="datasets.datalayer",
            ),
        ),
        migrations.AlterField(
            model_name="treatmentgoalusesdatalayer",
            name="treatment_goal",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="datalayer_usages",
                to="planning.treatmentgoal",
            ),
        ),
    ]
