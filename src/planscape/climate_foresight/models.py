from typing import Optional

from core.gcs import create_download_url as create_gcs_download_url
from core.gcs import get_bucket_and_key as get_gcs_bucket_and_key
from core.gcs import is_gcs_file
from core.models import CreatedAtMixin
from core.s3 import create_download_url as create_s3_download_url
from core.s3 import get_bucket_and_key as get_s3_bucket_and_key
from core.s3 import is_s3_file
from datasets.models import DataLayer
from django.contrib.auth.models import User
from django.db import models
from planning.models import GeoPackageStatus, PlanningArea


class ClimateForesightRunManager(models.Manager):
    def list_by_user(self, user: User):
        planning_areas = list(
            PlanningArea.objects.list_by_user(user).values_list("pk", flat=True)
        )
        return self.get_queryset().filter(planning_area_id__in=planning_areas)

    def list_by_planning_area(self, planning_area: PlanningArea, user: User):
        """Returns ClimateForesightRun analyses for a given planning area and user."""
        return self.list_by_user(user).filter(planning_area=planning_area)


class ClimateForesightRunStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    RUNNING = "running", "Running"
    DONE = "done", "Done"
    FAILED = "failed", "Failed"


class ClimateForesightRun(CreatedAtMixin, models.Model):
    """Climate Foresight Run model."""

    planning_area = models.ForeignKey(
        PlanningArea,
        on_delete=models.CASCADE,
        related_name="climate_foresight_runs",
        help_text="Planning area this run belongs to",
    )

    name = models.CharField(
        max_length=255, help_text="Name of the climate foresight run"
    )

    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="climate_foresight_runs",
        help_text="User who created this run",
    )

    status = models.CharField(
        max_length=20,
        choices=ClimateForesightRunStatus.choices,
        default="draft",
        help_text="Current status of the run",
    )

    current_step = models.IntegerField(
        default=1,
        help_text="Current step user is on (1=data layers, 2=favorability, 3=pillars, 4=run)",
    )

    furthest_step = models.IntegerField(
        default=1,
        help_text="Furthest step completed (enables resume/skip forward)",
    )

    objects = ClimateForesightRunManager()

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Climate Foresight Run"
        verbose_name_plural = "Climate Foresight Runs"

    def __str__(self):
        return f"{self.name} - {self.planning_area.name}"

    def all_pillars_rolled_up(self) -> bool:
        """Check if all assigned pillars have completed rollup."""
        assigned_pillars = (
            self.input_datalayers.exclude(pillar_id__isnull=True)
            .values_list("pillar_id", flat=True)
            .distinct()
        )

        # If no pillars are assigned, consider it ready (landscape will use normalized layers directly)
        if not assigned_pillars.exists():
            return True

        completed_rollups = self.pillar_rollups.filter(
            status=ClimateForesightPillarRollupStatus.COMPLETED
        ).values_list("pillar_id", flat=True)

        return set(assigned_pillars) == set(completed_rollups)


class ClimateForesightPillar(CreatedAtMixin, models.Model):
    """
    Represents pillars for organizing climate foresight data layers.

    Global pillars (null run) represent the 10 pillars of fire resilience and cannot be deleted.
    Run-specific pillars are custom pillars created by users and can only be deleted
    when the run is in draft mode.
    """

    run = models.ForeignKey(
        ClimateForesightRun,
        on_delete=models.CASCADE,
        related_name="custom_pillars",
        null=True,
        help_text="If null, this is a global/shared pillar. If set, it's specific to that run.",
    )

    name = models.CharField(max_length=255, help_text="Name of the pillar")

    order = models.IntegerField(default=0, help_text="Display order for the pillar")

    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="created_climate_foresight_pillars",
        help_text="User who created this pillar",
    )

    class Meta:
        ordering = ["order", "name"]
        verbose_name = "Climate Foresight Pillar"
        verbose_name_plural = "Climate Foresight Pillars"
        constraints = [
            models.UniqueConstraint(
                fields=["name"],
                condition=models.Q(run__isnull=True),
                name="unique_global_climate_foresight_pillar_name",
            ),
            models.UniqueConstraint(
                fields=["run", "name"],
                condition=models.Q(run__isnull=False),
                name="unique_run_climate_foresight_pillar_name",
            ),
        ]

    def __str__(self):
        scope = "Custom" if self.is_custom else "Global"
        return f"{self.name} ({scope})"

    @property
    def is_custom(self) -> bool:
        """Returns True if this is a custom (run-specific) pillar."""
        return self.run is not None

    def can_delete(self) -> bool:
        """
        Determines if this pillar can be deleted.

        Global pillars cannot be deleted.
        Run-specific pillars can only be deleted if the run is in draft mode.
        """
        if not self.is_custom:
            return False
        return self.run.status == ClimateForesightRunStatus.DRAFT

    def delete(self, using=None, keep_parents=False):
        """
        Override delete to enforce deletion rules.

        Raises ValueError if the pillar cannot be deleted according to can_delete() rules.
        """
        if not self.can_delete():
            if not self.is_custom:
                raise ValueError("Global pillars cannot be deleted.")
            raise ValueError(
                f"Custom pillars can only be deleted when the run is in draft mode. "
                f"Current status: {self.run.status}"
            )
        return super().delete(using=using, keep_parents=keep_parents)


class InputDataLayerStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    RUNNING = "running", "Running"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"


class ClimateForesightRunInputDataLayer(CreatedAtMixin, models.Model):
    """Represents a data layer selected for a climate foresight run with its configuration."""

    run = models.ForeignKey(
        ClimateForesightRun,
        on_delete=models.CASCADE,
        related_name="input_datalayers",
        help_text="Climate foresight run this input belongs to",
    )

    datalayer = models.ForeignKey(
        DataLayer,
        on_delete=models.CASCADE,
        related_name="climate_foresight_inputs",
        help_text="Data layer being used as input",
    )

    favor_high = models.BooleanField(
        null=True,
        blank=True,
        help_text="True if high values are favorable, False if low values are favorable",
    )

    pillar = models.ForeignKey(
        ClimateForesightPillar,
        on_delete=models.SET_NULL,
        null=True,
        related_name="datalayer_assignments",
        help_text="Optional pillar assignment for this data layer",
    )

    status = models.CharField(
        max_length=20,
        choices=InputDataLayerStatus.choices,
        default=InputDataLayerStatus.PENDING,
        help_text="Current processing status of this input data layer",
    )

    normalized_datalayer = models.ForeignKey(
        DataLayer,
        on_delete=models.SET_NULL,
        related_name="climate_foresight_normalized_for",
        null=True,
        help_text="The normalized version of this input data layer (for Climate Foresight analysis only)",
    )

    statistics = models.JSONField(
        null=True,
        blank=True,
        help_text=(
            "Statistics and normalization metadata. Structure: "
            "{"
            "  'original': {min, max, mean, std, count, percentiles: {p5, p10, p90, p95}}, "
            "  'normalization': {transformation, original_skew, transformed_skew, outlier_min_p10, outlier_max_p90, favor_high}"
            "}"
        ),
    )

    class Meta:
        ordering = ["id"]
        verbose_name = "Climate Foresight Run Input Data Layer"
        verbose_name_plural = "Climate Foresight Run Input Data Layers"
        constraints = [
            models.UniqueConstraint(
                fields=["run", "datalayer"],
                name="climateforesightruninputdatalayer_unique_constraint",
            )
        ]

    def __str__(self):
        return self.datalayer.name


class ClimateForesightPillarRollupStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    RUNNING = "running", "Running"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"


class ClimateForesightPillarRollup(CreatedAtMixin, models.Model):
    """
    Stores the rolled-up raster for a pillar within a specific run.

    Since pillars are reusable (global pillars) across runs, we need a separate
    model to track the rollup result for each (run, pillar) combination.
    """

    run = models.ForeignKey(
        ClimateForesightRun,
        on_delete=models.CASCADE,
        related_name="pillar_rollups",
        help_text="Climate foresight run this rollup belongs to",
    )

    pillar = models.ForeignKey(
        ClimateForesightPillar,
        on_delete=models.CASCADE,
        related_name="rollups",
        help_text="Pillar that was rolled up",
    )

    rollup_datalayer = models.ForeignKey(
        DataLayer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="climate_foresight_pillar_rollup",
        help_text="The rolled-up raster for this pillar (weighted average of normalized metrics)",
    )

    status = models.CharField(
        max_length=20,
        choices=ClimateForesightPillarRollupStatus.choices,
        default=ClimateForesightPillarRollupStatus.PENDING,
        help_text="Current status of the rollup",
    )

    weights = models.JSONField(
        null=True,
        blank=True,
        help_text=(
            "Weights used for rollup. Structure: "
            "{"
            "  'layer_id': weight_value, "
            "  'correlation_scores': {layer_id: correlation}, "
            "  'method': 'optimized' or 'equal'"
            "}"
        ),
    )

    method = models.CharField(
        max_length=20,
        choices=[("optimized", "Optimized"), ("equal", "Equal")],
        default="optimized",
        help_text="Weight calculation method used for rollup",
    )

    class Meta:
        ordering = ["pillar__order", "pillar__name"]
        verbose_name = "Climate Foresight Pillar Rollup"
        verbose_name_plural = "Climate Foresight Pillar Rollups"
        constraints = [
            models.UniqueConstraint(
                fields=["run", "pillar"],
                name="unique_run_pillar_rollup",
            )
        ]

    def __str__(self):
        return f"{self.pillar.name} rollup for {self.run.name}"


class ClimateForesightLandscapeRollupStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    RUNNING = "running", "Running"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"


class ClimateForesightLandscapeRollup(CreatedAtMixin, models.Model):
    """
    Stores the landscape-level rollup for a Climate Foresight run.

    This aggregates all pillar rollups into two landscape-level rasters:
    - current_datalayer: Average of all current condition pillar rollups
    - future_datalayer: Average of matched future climate condition layers

    These two rasters are inputs to the PROMOTe analysis.
    """

    run = models.OneToOneField(
        ClimateForesightRun,
        on_delete=models.CASCADE,
        related_name="landscape_rollup",
        help_text="Climate foresight run this landscape rollup belongs to",
    )

    current_datalayer = models.ForeignKey(
        DataLayer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="climate_foresight_current_landscape",
        help_text="Aggregated current conditions landscape raster (0-100)",
    )

    future_datalayer = models.ForeignKey(
        DataLayer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="climate_foresight_future_landscape",
        help_text="Aggregated future conditions landscape raster (0-100)",
    )

    status = models.CharField(
        max_length=20,
        choices=ClimateForesightLandscapeRollupStatus.choices,
        default=ClimateForesightLandscapeRollupStatus.PENDING,
        help_text="Current status of the landscape rollup",
    )

    future_mapping = models.JSONField(
        null=True,
        blank=True,
        help_text=(
            "Maps pillar_id to future climate layer_id used. "
            "Structure: {pillar_id: {layer_id: X, matched: true/false, default: true/false}}"
        ),
    )

    class Meta:
        verbose_name = "Climate Foresight Landscape Rollup"
        verbose_name_plural = "Climate Foresight Landscape Rollups"

    def __str__(self):
        return f"Landscape rollup for {self.run.name}"


class ClimateForesightPromoteStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    RUNNING = "running", "Running"
    COMPLETED = "completed", "Completed"
    FAILED = "failed", "Failed"


class ClimateForesightPromote(CreatedAtMixin, models.Model):
    """
    Stores PROMOTe analysis outputs for a Climate Foresight run.

    PROMOTe (Monitor, Protect, Adapt, Transform) analysis generates multiple
    output rasters based on current and future landscape conditions.
    """

    run = models.OneToOneField(
        ClimateForesightRun,
        on_delete=models.CASCADE,
        related_name="promote_analysis",
        help_text="Climate foresight run this PROMOTe analysis belongs to",
    )

    status = models.CharField(
        max_length=20,
        choices=ClimateForesightPromoteStatus.choices,
        default=ClimateForesightPromoteStatus.PENDING,
        help_text="Current status of the PROMOTe analysis",
    )

    # MPAT strategy scores
    monitor_datalayer = models.ForeignKey(
        DataLayer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="climate_foresight_monitor",
        help_text="Monitor strategy score (0-100)",
    )

    protect_datalayer = models.ForeignKey(
        DataLayer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="climate_foresight_protect",
        help_text="Protect strategy score (0-100)",
    )

    adapt_datalayer = models.ForeignKey(
        DataLayer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="climate_foresight_adapt",
        help_text="Adapt strategy score (0-100)",
    )

    transform_datalayer = models.ForeignKey(
        DataLayer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="climate_foresight_transform",
        help_text="Transform strategy score (0-100)",
    )

    # combined scores
    adapt_protect_datalayer = models.ForeignKey(
        DataLayer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="climate_foresight_adapt_protect",
        help_text="Adapt-Protect score (0-100, rescaled)",
    )

    integrated_condition_score_datalayer = models.ForeignKey(
        DataLayer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="climate_foresight_ics",
        help_text="Integrated Condition Score (0-100)",
    )

    # MPAT outputs
    mpat_matrix_datalayer = models.ForeignKey(
        DataLayer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="climate_foresight_mpat_matrix",
        help_text="MPAT Matrix - categorical (1=Monitor, 2=Protect, 3=Adapt, 4=Transform)",
    )

    mpat_strength_datalayer = models.ForeignKey(
        DataLayer,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="climate_foresight_mpat_strength",
        help_text="MPAT with strength classification (weak/strong)",
    )

    # Geopackage export fields
    geopackage_status = models.CharField(
        max_length=32,
        choices=GeoPackageStatus.choices,
        null=True,
        help_text="Status of the geopackage generation.",
    )

    geopackage_url = models.URLField(
        null=True,
        help_text="Cloud storage URL of the generated geopackage ZIP file.",
    )

    class Meta:
        verbose_name = "Climate Foresight PROMOTe Analysis"
        verbose_name_plural = "Climate Foresight PROMOTe Analyses"

    def __str__(self):
        return f"PROMOTe analysis for {self.run.name}"

    def get_geopackage_url(self) -> Optional[str]:
        """Generate a signed download URL for the geopackage."""
        if not self.geopackage_url:
            return None

        if is_s3_file(self.geopackage_url):
            bucket, key = get_s3_bucket_and_key(self.geopackage_url)
            return create_s3_download_url(bucket, key)
        elif is_gcs_file(self.geopackage_url):
            bucket, key = get_gcs_bucket_and_key(self.geopackage_url)
            return create_gcs_download_url(self.geopackage_url, bucket_name=bucket)
        return None
