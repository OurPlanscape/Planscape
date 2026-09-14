import django.db.models.deletion
from django.db import migrations, models


CATEGORY_NAMES = {
    "FIRE_DYNAMICS": "Fire Dynamics",
    "BIODIVERSITY": "Biodiversity",
    "CARBON_BIOMASS": "Carbon/Biomass",
}


def seed_and_backfill_categories(apps, schema_editor):
    TreatmentGoal = apps.get_model("planning", "TreatmentGoal")
    TreatmentGoalCategory = apps.get_model("planning", "TreatmentGoalCategory")

    categories = {}
    for old_value, name in CATEGORY_NAMES.items():
        category, _created = TreatmentGoalCategory.objects.get_or_create(name=name)
        categories[old_value] = category

    for treatment_goal in TreatmentGoal.objects.exclude(category_old__isnull=True):
        category = categories.get(treatment_goal.category_old)
        if category:
            treatment_goal.category = category
            treatment_goal.save(update_fields=["category"])


class Migration(migrations.Migration):
    dependencies = [
        ("planning", "0094_scenarioresult_errors"),
    ]

    operations = [
        migrations.CreateModel(
            name="TreatmentGoalCategory",
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
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "name",
                    models.CharField(
                        help_text="Name of the Treatment Goal category.",
                        max_length=120,
                        unique=True,
                    ),
                ),
            ],
            options={
                "verbose_name_plural": "Treatment Goal Categories",
                "ordering": ["name"],
            },
        ),
        migrations.RenameField(
            model_name="treatmentgoal",
            old_name="category",
            new_name="category_old",
        ),
        migrations.AddField(
            model_name="treatmentgoal",
            name="category",
            field=models.ForeignKey(
                help_text="Treatment Goal category.",
                null=True,
                on_delete=django.db.models.deletion.RESTRICT,
                related_name="treatment_goals",
                to="planning.treatmentgoalcategory",
            ),
        ),
        migrations.RunPython(
            seed_and_backfill_categories,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.RemoveField(
            model_name="treatmentgoal",
            name="category_old",
        ),
    ]
