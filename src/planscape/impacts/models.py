from collections import defaultdict
from typing import List, Optional, Tuple, Type, Union

from core.models import (
    AliveObjectsManager,
    CreatedAtMixin,
    DeletedAtMixin,
    UpdatedAtMixin,
    UUIDMixin,
)
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.gis.db import models
from django_stubs_ext.db.models import TypedModelMeta
from datasets.models import DataLayer, DataLayerType
from impacts.calculator import calculate_delta
from organizations.models import Organization
from planning.models import ProjectArea, Scenario
from stands.models import Stand
from typing_extensions import Self

from planscape.typing import TUser

User = get_user_model()


class TreatmentPlanStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    RUNNING = "RUNNING", "Running"
    SUCCESS = "SUCCESS", "Suceess"
    FAILURE = "FAILURE", "Failure"


class TreatmentPlanManager(AliveObjectsManager):
    def list_by_user(self, user: Optional[TUser]):
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
        help_text="User ID that created Treatment Plan.",
    )
    scenario = models.ForeignKey(
        Scenario,
        related_name="tx_plans",
        on_delete=models.RESTRICT,
        help_text="Scenario ID.",
    )
    status = models.CharField(
        choices=TreatmentPlanStatus.choices,
        default=TreatmentPlanStatus.PENDING,
        help_text="Status of Treatment Plan (choice).",
    )
    name = models.CharField(max_length=256, help_text="Name of Treatment Plan.")

    objects = TreatmentPlanManager()

    class Meta(TypedModelMeta):
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
        help_text="User ID that created Treatment Prescription.",
    )

    updated_by = models.ForeignKey(
        User,
        related_name="updated_tx_prescriptions",
        on_delete=models.RESTRICT,
        help_text="User ID that updated Treatment Prescription.",
    )

    treatment_plan = models.ForeignKey(
        TreatmentPlan,
        related_name="tx_prescriptions",
        on_delete=models.RESTRICT,
        null=True,
        help_text="Treatment Plan ID.",
    )

    project_area = models.ForeignKey(
        ProjectArea,
        related_name="tx_prescriptions",
        on_delete=models.RESTRICT,
        help_text="Project Area ID.",
    )

    type = models.CharField(
        choices=TreatmentPrescriptionType.choices,
        default=TreatmentPrescriptionType.SINGLE,
        help_text="Type of Treatment Prescription (choice).",
    )

    action = models.CharField(
        choices=TreatmentPrescriptionAction.choices,
        help_text="Action of Treatment Prescription (choice).",
    )

    # I still can't decide if it's best for us to clone the stand geometry
    # or to have a direct reference to it. I think cloning makes sense because
    # it actually frees us from a lot of FK handling
    stand = models.ForeignKey(
        Stand,
        related_name="tx_prescriptions",
        on_delete=models.SET_NULL,
        null=True,
        help_text="Stand which Treatment Prescription will be applied.",
    )

    geometry = models.PolygonField(
        srid=settings.CRS_INTERNAL_REPRESENTATION,
        help_text="Geometry of the Treatment Prescription.",
    )

    class Meta(TypedModelMeta):
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
    MINORITY = "MINORITY", "Minority"

    @classmethod
    def get_rasterstats_agg(cls, value):
        return {
            cls.SUM: "sum",
            cls.MEAN: "mean",
            cls.COUNT: "count",
            cls.MAX: "max",
            cls.MIN: "min",
            cls.MAJORITY: "majority",
            cls.MINORITY: "minority",
        }[value]

    @classmethod
    def get_metric_attribute(cls, value):
        return {
            cls.SUM: "sum",
            cls.MEAN: "avg",
            cls.COUNT: "count",
            cls.MAX: "max",
            cls.MIN: "min",
            cls.MAJORITY: "majority",
            cls.MINORITY: "minority",
        }[value]


AVAILABLE_YEARS = (
    2024,
    2029,
    2034,
    2039,
    2044,
)


class ImpactVariable(models.TextChoices):
    CROWN_BULK_DENSITY = "CBD", "Crown Bulk Density"
    CANOPY_BASE_HEIGHT = "CBH", "Canopy Base Height"
    CANOPY_COVER = "CC", "Canopy Cover"
    FIRE_BEHAVIOR_FUEL_MODEL = "FBFM", "Fire Behavior/Fuel Model"
    FLAME_LENGTH = "FL", "Flame Length"
    LARGE_TREE_BIOMASS = "LARGE_TREE_BIOMASS", "Large Tree Biomass"
    MERCH_BIOMASS = "MERCH_BIOMASS", "Merch Biomass"
    MORTALITY = "MORTALITY", "Mortality"
    NON_MERCH_BIOMASS = "NON_MERCH_BIOMASS", "Non Merch Biomass"
    POTENTIAL_SMOKE = "POTENTIAL_SMOKE", "Potential Smoke"
    PROBABILITY_TORCHING = "PTORCH", "Probabiliy of Torching"
    QUADRATIC_MEAN_DIAMETER = "QMD", "Quadratic Mean Diameter"
    RATE_OF_SPREAD = "ROS", "Rate of Spread"
    STAND_DENSITY_INDEX = "SDI", "Stand Density Index"
    TOTAL_HEIGHT = "TH", "Total Height"
    TOTAL_FLAME_SEVERITY = "TOT_FLAME_SEV", "Total Flame Severity"
    TOTAL_CARBON = "TOTAL_CARBON", "Total Carbon"

    @classmethod
    def get_aggregations(cls, impact_variable) -> List[ImpactVariableAggregation]:
        AGGREGATIONS = {
            cls.CROWN_BULK_DENSITY: [ImpactVariableAggregation.MEAN],
            cls.CANOPY_BASE_HEIGHT: [ImpactVariableAggregation.MEAN],
            cls.CANOPY_COVER: [ImpactVariableAggregation.MEAN],
            cls.FIRE_BEHAVIOR_FUEL_MODEL: [],
            cls.FLAME_LENGTH: [ImpactVariableAggregation.MEAN],
            cls.LARGE_TREE_BIOMASS: [
                ImpactVariableAggregation.SUM,
                ImpactVariableAggregation.MEAN,
            ],
            cls.MERCH_BIOMASS: [
                ImpactVariableAggregation.SUM,
                ImpactVariableAggregation.MEAN,
            ],
            cls.MORTALITY: [],
            cls.NON_MERCH_BIOMASS: [
                ImpactVariableAggregation.SUM,
                ImpactVariableAggregation.MEAN,
            ],
            cls.POTENTIAL_SMOKE: [
                ImpactVariableAggregation.SUM,
                ImpactVariableAggregation.MEAN,
            ],
            cls.PROBABILITY_TORCHING: [ImpactVariableAggregation.MEAN],
            cls.QUADRATIC_MEAN_DIAMETER: [ImpactVariableAggregation.MEAN],
            cls.RATE_OF_SPREAD: [ImpactVariableAggregation.MEAN],
            cls.STAND_DENSITY_INDEX: [ImpactVariableAggregation.MEAN],
            cls.TOTAL_HEIGHT: [ImpactVariableAggregation.MEAN],
            cls.TOTAL_FLAME_SEVERITY: [ImpactVariableAggregation.MEAN],
            cls.TOTAL_CARBON: [
                ImpactVariableAggregation.SUM,
                ImpactVariableAggregation.MEAN,
            ],
        }
        return list([x for x in AGGREGATIONS[impact_variable]])

    @classmethod
    def get_datalayer(
        cls,
        impact_variable: Self,
        year: int,
        action: Optional[TreatmentPrescriptionAction] = None,
    ) -> DataLayer:
        baseline = action is None
        action_query = (
            TreatmentPrescriptionAction.get_file_mapping(action) if action else None
        )
        query = {
            "modules": {
                "impacts": {
                    "year": year,
                    "baseline": baseline,
                    "variable": str(impact_variable),
                    "action": action_query,
                }
            }
        }
        return DataLayer.objects.get(
            type=DataLayerType.RASTER,
            metadata__contains=query,
        )

    @classmethod
    def get_baseline_raster_path(
        cls, impact_variable: Self, year: int
    ) -> Optional[str]:
        return cls.get_datalayer(
            impact_variable=impact_variable,
            year=year,
            action=None,
        ).url

    @classmethod
    def get_impact_raster_path(
        cls,
        impact_variable: Self,
        action: Optional[TreatmentPrescriptionAction],
        year: int,
    ) -> Optional[str]:
        return cls.get_datalayer(
            impact_variable=impact_variable,
            year=year,
            action=action,
        ).url


class TreatmentResultType(models.TextChoices):
    DIRECT = "DIRECT", "Direct"
    INDIRECT = "INDIRECT", "Indirect"


class ProjectAreaTreatmentResult(CreatedAtMixin, DeletedAtMixin, models.Model):
    treatment_plan = models.ForeignKey(
        TreatmentPlan,
        on_delete=models.RESTRICT,
        related_name="project_area_results",
    )
    project_area = models.ForeignKey(
        ProjectArea,
        on_delete=models.RESTRICT,
        related_name="project_area_results",
    )
    variable = models.CharField(
        choices=ImpactVariable.choices, help_text="Impact Variable (choice)."
    )
    aggregation = models.CharField(
        choices=ImpactVariableAggregation.choices,
        help_text="Impact Variable Aggregation (choice).",
    )
    year = models.IntegerField(
        default=0,
        help_text="Number of year for the result.",
    )
    value = models.FloatField(
        help_text="Value extracted for the prescriptions inside this project area.",
        null=True,
    )
    baseline = models.FloatField(
        help_text="Baseline value extract from the prescriptions inside this project area."
    )
    delta = models.FloatField(
        null=True,
    )
    type = models.CharField(
        choices=TreatmentResultType.choices,
        default=TreatmentResultType.DIRECT,
        help_text="Type of Treatment Result (choice).",
    )

    class Meta(TypedModelMeta):
        constraints = [
            models.UniqueConstraint(
                # given a specific project area we can only have a single value for the same
                # variable, aggregationa and year
                fields=[
                    "treatment_plan",
                    "project_area",
                    "variable",
                    "aggregation",
                    "year",
                ],
                name="project_area_treatment_result_unique_constraint",
            )
        ]


class TreatmentResult(CreatedAtMixin, DeletedAtMixin, models.Model):
    id: int
    treatment_plan_id: int
    treatment_plan = models.ForeignKey(
        TreatmentPlan,
        on_delete=models.RESTRICT,
        related_name="results",
        help_text="Treatment Plan ID.",
    )

    stand_id: int
    stand = models.ForeignKey(
        Stand,
        on_delete=models.RESTRICT,
        related_name="tx_results",
        null=True,
    )

    variable = models.CharField(
        choices=ImpactVariable.choices, help_text="Impact Variable (choice)."
    )
    action = models.CharField(
        choices=TreatmentPrescriptionAction.choices,
        null=True,
    )
    aggregation = models.CharField(
        choices=ImpactVariableAggregation.choices,
        help_text="Impact Variable Aggregation (choice).",
    )
    year = models.IntegerField(default=0, help_text="Number of year for the result.")
    value = models.FloatField(
        help_text="Value extracted for the prescription stand, based on variable, year and variable aggreation type.",
        null=True,
    )
    baseline = models.FloatField(
        null=True,
    )
    delta = models.FloatField(
        null=True,
    )
    type = models.CharField(
        choices=TreatmentResultType.choices,
        default=TreatmentResultType.DIRECT,
        help_text="Type of Treatment Result (choice).",
        null=True,
    )

    class Meta(TypedModelMeta):
        constraints = [
            models.UniqueConstraint(
                # given a specific treatment prescription, we can only have a single value for the same
                # variable, aggregationa and year
                fields=[
                    "treatment_plan",
                    "stand",
                    "variable",
                    "action",
                    "year",
                    "aggregation",
                ],
                name="treatment_result_unique_constraint",
            )
        ]


TTreatmentPlanCloneResult = Tuple[TreatmentPlan, List[TreatmentPrescription]]
