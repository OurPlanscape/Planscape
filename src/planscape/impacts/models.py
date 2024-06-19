from django.contrib.gis.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from planning.models import ProjectArea, Scenario
from stands.models import Stand
from core.models import CreatedAtMixin, UpdatedAtMixin, DeletedAtMixin, UUIDMixin


User = get_user_model()


class TreatmentPlanStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    RUNNING = "RUNNING", "Running"
    SUCCESS = "SUCCESS", "Suceess"
    FAILURE = "FAILURE", "Failure"


class TreatmentPlan(
    UUIDMixin,
    CreatedAtMixin,
    UpdatedAtMixin,
    DeletedAtMixin,
    models.Model,
):
    created_by = models.ForeignKey(
        User,
        related_name="tx_plans",
        on_delete=models.RESTRICT,
    )
    scenario = models.ForeignKey(
        Scenario,
        related_name="tx_plans",
        on_delete=models.RESTRICT,
    )
    status = models.CharField(
        choices=TreatmentPlanStatus.choices,
        default=TreatmentPlanStatus.PENDING,
    )
    name = models.CharField(max_length=256)

    class Meta:
        verbose_name = "Treatment Plan"
        verbose_name_plural = "Treatment Plans"


class TreatmentPrescriptionType(models.TextChoices):
    SINGLE = "SINGLE", "Single"
    SEQUENCE = "SEQUENCE", "Sequence"


class TreatmentPrescriptionAction(models.TextChoices):
    MODERATE_THINNING_BIOMASS = (
        "MODERATE_THINNING_BIOMASS",
        "Moderate Thinning & Biomass Removal",
    )
    HEAVY_THINNING_BIOMASS = (
        "HEAVY_THINNING_BIOMASS",
        "Heavy Thinning & Biomass Removal",
    )
    MODERATE_THINNING_BURN = (
        "MODERATE_THINNING_BURN",
        "Moderate Thinning & Pile Burn",
    )
    HEAVY_THINNING_BURN = "HEAVY_THINNING_BURN", "Heavy Thinning & Pile Burn"
    MODERATE_MASTICATION = "MODERATE_MASTICATION", "Moderate Mastication"
    HEAVY_MASTICATION = "HEAVY_MASTICATION", "Heavy Mastication"
    RX_FIRE = "RX_FIRE", "Prescribed Fire"
    HEAVY_THINNING_RX_FIRE = (
        "HEAVY_THINNING_RX_FIRE",
        "Heavy Thinning & Prescribed Fire",
    )
    MASTICATION_RX_FIRE = (
        "MASTICATION_RX_FIRE",
        "Mastication & Prescribed Fire",
    )
    MODERATE_THINNING_BURN_PLUS_RX_FIRE = (
        "MODERATE_THINNING_BURN_PLUS_RX_FIRE",
        "Moderate Thinning & Pile Burn (year 0), Prescribed Burn (year 10)",
    )
    MODERATE_THINNING_BURN_PLUS_MODERATE_THINNING_BURN = (
        "MODERATE_THINNING_BURN_PLUS_MODERATE_THINNING_BURN",
        "Moderate Thinning & Pile Burn (year 0), Moderate Thinning & Pile Burn (year 10)",
    )
    HEAVY_THINNING_BURN_PLUS_RX_FIRE = (
        "HEAVY_THINNING_BURN_PLUS_RX_FIRE",
        "Heavy Thinning & Pile Burn (year 0), Prescribed Burn (year 10)",
    )
    HEAVY_THINNING_BURN_PLUS_HEAVY_THINNING_BURN = (
        "HEAVY_THINNING_BURN_PLUS_HEAVY_THINNING_BURN",
        "Heavy Thinning & Pile Burn (year 0), Heavy Thinning & Pile Burn (year 10)",
    )
    RX_FIRE_PLUS_RX_FIRE = (
        "RX_FIRE_PLUS_RX_FIRE",
        "Prescribed Fire (year 0), Prescribed Fire (year 10)",
    )
    MODERATE_MASTICATION_PLUS_MODERATE_MASTICATION = (
        "MODERATE_MASTICATION_PLUS_MODERATE_MASTICATION",
        "Moderate Mastication (year 0), Moderate Mastication (year 10)",
    )
    HEAVY_THINNING_BIOMASS_PLUS_RX_FIRE = (
        "HEAVY_THINNING_BIOMASS_PLUS_RX_FIRE",
        "Heavy Thinning & Biomass Removal (year 0), Prescribed Fire (year 10)",
    )
    MODERATE_MASTICATION_PLUS_RX_FIRE = (
        "MODERATE_MASTICATION_PLUS_RX_FIRE",
        "Moderate Mastication (year 0), Prescribed Fire (year 10)",
    )


def get_prescription_type(
    action: TreatmentPrescriptionAction,
) -> TreatmentPrescriptionType:
    """returns the prescription type based on the action"""

    is_sequence = action in [
        TreatmentPrescriptionAction.MODERATE_THINNING_BURN_PLUS_RX_FIRE,
        TreatmentPrescriptionAction.MODERATE_THINNING_BURN_PLUS_MODERATE_THINNING_BURN,
        TreatmentPrescriptionAction.HEAVY_THINNING_BURN_PLUS_RX_FIRE,
        TreatmentPrescriptionAction.HEAVY_THINNING_BURN_PLUS_HEAVY_THINNING_BURN,
        TreatmentPrescriptionAction.RX_FIRE_PLUS_RX_FIRE,
        TreatmentPrescriptionAction.MODERATE_MASTICATION_PLUS_MODERATE_MASTICATION,
        TreatmentPrescriptionAction.HEAVY_THINNING_BIOMASS_PLUS_RX_FIRE,
        TreatmentPrescriptionAction.MODERATE_MASTICATION_PLUS_RX_FIRE,
    ]
    return (
        TreatmentPrescriptionType.SEQUENCE
        if is_sequence
        else TreatmentPrescriptionType.SINGLE
    )


class TreatmentPrescription(
    UUIDMixin,
    CreatedAtMixin,
    UpdatedAtMixin,
    DeletedAtMixin,
    models.Model,
):
    created_by = models.ForeignKey(
        User,
        related_name="created_tx_prescriptions",
        on_delete=models.RESTRICT,
    )

    updated_by = models.ForeignKey(
        User,
        related_name="updated_tx_prescriptions",
        on_delete=models.RESTRICT,
    )

    treatment_plan = models.ForeignKey(
        TreatmentPlan,
        related_name="tx_prescriptions",
        on_delete=models.RESTRICT,
        null=True,
    )

    project_area = models.ForeignKey(
        ProjectArea,
        related_name="tx_prescriptions",
        on_delete=models.RESTRICT,
    )

    type = models.CharField(
        choices=TreatmentPrescriptionType.choices,
        default=TreatmentPrescriptionType.SINGLE,
    )

    action = models.CharField(choices=TreatmentPrescriptionAction.choices)

    # I still can't decide if it's best for us to clone the stand geometry
    # or to have a direct reference to it. I think cloning makes sense because
    # it actually frees us from a lot of FK handling
    stand = models.ForeignKey(
        Stand,
        related_name="tx_prescriptions",
        on_delete=models.SET_NULL,
        null=True,
    )

    geometry = models.PolygonField(srid=settings.CRS_INTERNAL_REPRESENTATION)

    class Meta:
        verbose_name = "Treatment Prescription"
        verbose_name_plural = "Treatment Prescriptions"
