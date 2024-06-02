from django.conf import settings
import django.contrib.gis.db.models.fields
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("stands", "0007_alter_stand_created_at_alter_standmetric_created_at"),
        ("planning", "0018_projectarea"),
    ]

    operations = [
        migrations.CreateModel(
            name="TreatmentPrescription",
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
                    "deleted_at",
                    models.DateTimeField(
                        help_text="Define if the entity has been deleted or not and when",
                        null=True,
                        verbose_name="Deleted at",
                    ),
                ),
                ("uuid", models.UUIDField(db_index=True, default=uuid.uuid4)),
                (
                    "type",
                    models.CharField(
                        choices=[("SINGLE", "Single"), ("SEQUENCE", "Sequence")],
                        default="SINGLE",
                    ),
                ),
                (
                    "action",
                    models.CharField(
                        choices=[
                            (
                                "MODERATE_THINNING_BIOMASS",
                                "Moderate Thinning & Biomass Removal",
                            ),
                            (
                                "HEAVY_THINNING_BIOMASS",
                                "Heavy Thinning & Biomass Removal",
                            ),
                            ("MODERATE_THINNING_BURN", "Moderate Thinning & Pile Burn"),
                            ("HEAVY_THINNING_BURN", "Heavy Thinning & Pile Burn"),
                            ("MODERATE_MASTICATION", "Moderate Mastication"),
                            ("HEAVY_MASTICATION", "Heavy Mastication"),
                            ("RX_FIRE", "Prescribed Fire"),
                            (
                                "HEAVY_THINNING_RX_FIRE",
                                "Heavy Thinning & Prescribed Fire",
                            ),
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
                        ]
                    ),
                ),
                (
                    "geometry",
                    django.contrib.gis.db.models.fields.PolygonField(srid=4269),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="created_tx_prescriptions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "project_area",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="tx_prescriptions",
                        to="planning.projectarea",
                    ),
                ),
                (
                    "stand",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="tx_prescriptions",
                        to="stands.stand",
                    ),
                ),
                (
                    "updated_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="updated_tx_prescriptions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Treatment Prescription",
                "verbose_name_plural": "Treatment Prescriptions",
            },
        ),
        migrations.CreateModel(
            name="TreatmentPlan",
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
                    "deleted_at",
                    models.DateTimeField(
                        help_text="Define if the entity has been deleted or not and when",
                        null=True,
                        verbose_name="Deleted at",
                    ),
                ),
                ("uuid", models.UUIDField(db_index=True, default=uuid.uuid4)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("PENDING", "Pending"),
                            ("RUNNING", "Running"),
                            ("SUCCESS", "Suceess"),
                            ("FAILURE", "Failure"),
                        ],
                        default="PENDING",
                    ),
                ),
                ("name", models.CharField(max_length=256)),
                (
                    "created_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="tx_plans",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "scenario",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.RESTRICT,
                        related_name="tx_plans",
                        to="planning.scenario",
                    ),
                ),
            ],
            options={
                "verbose_name": "Treatment Plan",
                "verbose_name_plural": "Treatment Plans",
            },
        ),
    ]
