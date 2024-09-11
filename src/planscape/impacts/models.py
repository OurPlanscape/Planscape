from collections import defaultdict
from typing import Dict, List, Optional
from typing_extensions import Self
from django.contrib.gis.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from planning.models import ProjectArea, Scenario
from planscape.typing import UserType
from stands.models import Stand
from core.models import (
    AliveObjectsManager,
    CreatedAtMixin,
    UpdatedAtMixin,
    DeletedAtMixin,
    UUIDMixin,
)


User = get_user_model()


class TreatmentPlanStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    RUNNING = "RUNNING", "Running"
    SUCCESS = "SUCCESS", "Suceess"
    FAILURE = "FAILURE", "Failure"


class TreatmentPlanManager(AliveObjectsManager):
    def list_by_user(self, user: Optional[UserType]):
        if not user:
            return self.get_queryset().none()
        # this will become super slow when the database get's bigger
        scenarios = Scenario.objects.list_by_user(user=user).values_list(
            "id", flat=True
        )
        return self.get_queryset().filter(scenario_id__in=scenarios)


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

    objects = TreatmentPlanManager()

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

    @classmethod
    def get_file_mapping(cls, action: Self) -> str:
        data = {
            cls.MODERATE_THINNING_BIOMASS: "Treatment_1",
            cls.HEAVY_THINNING_BIOMASS: "Treatment_2",
            cls.MODERATE_THINNING_BURN: "Treatment_3",
            cls.HEAVY_THINNING_BURN: "Treatment_4",
            cls.MODERATE_MASTICATION: "Treatment_5",
            cls.HEAVY_MASTICATION: "Treatment_6",
            cls.RX_FIRE: "Treatment_7",
            cls.HEAVY_THINNING_RX_FIRE: "Treatment_8",
            cls.MASTICATION_RX_FIRE: "Treatment_9",
            cls.MODERATE_THINNING_BURN_PLUS_RX_FIRE: "Seq_1",
            cls.MODERATE_THINNING_BURN_PLUS_MODERATE_THINNING_BURN: "Seq_2",
            cls.HEAVY_THINNING_BURN_PLUS_RX_FIRE: "Seq_3",
            cls.HEAVY_THINNING_BURN_PLUS_HEAVY_THINNING_BURN: "Seq_4",
            cls.RX_FIRE_PLUS_RX_FIRE: "Seq_5",
            cls.MODERATE_MASTICATION_PLUS_MODERATE_MASTICATION: "Seq_6",
            cls.HEAVY_THINNING_BIOMASS_PLUS_RX_FIRE: "Seq_7",
            cls.MODERATE_MASTICATION_PLUS_RX_FIRE: "Seq_8",
        }
        return data[action]

    @classmethod
    def json(cls):
        output = defaultdict(dict)
        for key, item in dict(cls.choices).items():
            rx_type = str(get_prescription_type(key))
            output[rx_type][key] = item

        return output


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
        constraints = [
            models.UniqueConstraint(
                fields=["treatment_plan", "stand"],
                include=["type", "action"],
                name="treatment_prescription_treatment_plan_unique_constraint",
            )
        ]


class ImpactVariableAggregation(models.TextChoices):
    SUM = "SUM", "Sum"
    MEAN = "MEAN", "Mean"
    COUNT = "COUNT", "Count"
    MAX = "MAX", "Max"
    MIN = "MIN", "Min"
    MAJORITY = "MAJORITY", "Majority"


class ImpactVariable(models.TextChoices):
    CROWN_BULK_DENSITY = "CBD", "Crown Bulk Density"
    CANOPY_BASE_HEIGHT = "CBH", "Canopy Base Height"
    CANOPY_COVER = "CC", "Canopy Cover"
    FUEL_BED_FUEL_MODEL = "FBFM", "Fuel Bed/Fuel Model"
    LARGE_TREE_BIOMASS = "LARGE_TREE_BIOMASS", "Large Tree Biomass"
    MERCH_BIOMASS = "MERCH_BIOMASS", "Merch Biomass"
    MORTALITY = "MORTALITY", "Mortality"
    NON_MERCH_BIOMASS = "NON_MERCH_BIOMASS", "Non Merch Biomass"
    POTENTIAL_SMOKE = "POTENTIAL_SMOKE", "Potential Smoke"
    PROBABILITY_TORCHING = "PTORCH", "Probabiliy of Torching"
    QUADRATIC_MEAN_DIAMETER = "QMD", "Quadratic Mean Diameter"
    STAND_DENSITY_INDEX = "SDI", "Stand Density Index"
    TOTAL_HEIGHT = "TH", "Total Height"
    TOTAL_FLAME_SEVERITY = "TOT_FLAME_SEV", "Total Flame Severity"
    TOTAL_CARBON = "TOTAL_CARBON", "Total Carbon"

    AGGREGATIONS = {
        CROWN_BULK_DENSITY: [ImpactVariableAggregation.MEAN],
        CANOPY_BASE_HEIGHT: [ImpactVariableAggregation.MEAN],
        CANOPY_COVER: [ImpactVariableAggregation.MEAN],
        FUEL_BED_FUEL_MODEL: [],
        LARGE_TREE_BIOMASS: [
            ImpactVariableAggregation.SUM,
            ImpactVariableAggregation.MEAN,
        ],
        MERCH_BIOMASS: [ImpactVariableAggregation.SUM, ImpactVariableAggregation.MEAN],
        MORTALITY: [],
        NON_MERCH_BIOMASS: [
            ImpactVariableAggregation.SUM,
            ImpactVariableAggregation.MEAN,
        ],
        POTENTIAL_SMOKE: [
            ImpactVariableAggregation.SUM,
            ImpactVariableAggregation.MEAN,
        ],
        PROBABILITY_TORCHING: [ImpactVariableAggregation.MEAN],
        QUADRATIC_MEAN_DIAMETER: [ImpactVariableAggregation.MEAN],
        STAND_DENSITY_INDEX: [ImpactVariableAggregation.MEAN],
        TOTAL_HEIGHT: [ImpactVariableAggregation.MEAN],
        TOTAL_FLAME_SEVERITY: [ImpactVariableAggregation.MEAN],
        TOTAL_CARBON: [ImpactVariableAggregation.SUM, ImpactVariableAggregation.MEAN],
    }

    @classmethod
    def get_aggregations(cls, impact_variable) -> List[ImpactVariableAggregation]:
        return cls.AGGREGATIONS[impact_variable]

    @classmethod
    def s3_path(
        cls,
        impact_variable: Self,
        year: int,
        action: Optional[TreatmentPrescriptionAction] = None,
    ) -> str:
        treatment_name = (
            TreatmentPrescriptionAction.get_file_mapping(action)
            if action
            else "Baseline"
        )
        variable = str(impact_variable).lower()
        return f"s3://{settings.S3_BUCKET}/rasters/impacts/{treatment_name}_{year}_{variable}_3857_COG.tif"


class TreatmentResult(CreatedAtMixin, DeletedAtMixin, models.Model):
    treatment_plan = models.ForeignKey(
        TreatmentPlan,
        on_delete=models.RESTRICT,
        related_name="results",
    )
    treatment_prescription = models.ForeignKey(
        TreatmentPrescription, on_delete=models.RESTRICT, related_name="results"
    )
    variable = models.CharField(choices=ImpactVariable.choices)
    aggregation = models.CharField(choices=ImpactVariableAggregation.choices)
    year = models.IntegerField(default=0)
    value = models.FloatField(
        help_text="Value extracted for the prescription stand, based on variable, year and variable aggreation type."
    )
    delta = models.FloatField(
        help_text="Delta between this years value and base year value. From 0-1, null for base years.",
        null=True,
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(
                # given a specific treatment prescription, we can only have a single value for the same
                # variable, aggregationa and year
                fields=[
                    "treatment_prescription",
                    "variable",
                    "aggregation",
                    "year",
                ],
                name="treatment_result_unique_constraint",
            )
        ]
