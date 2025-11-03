from django.contrib.auth.models import User
from django.db import models
from core.models import CreatedAtMixin
from datasets.models import DataLayer
from planning.models import PlanningArea


class ClimateForesightRunManager(models.Manager):
    def list_by_user(self, user: User):
        """Returns ClimateForesightRun analyses for a given user."""
        return self.filter(created_by=user)

    def list_by_planning_area(self, planning_area: PlanningArea, user: User):
        """Returns ClimateForesightRun analyses for a given planning area and user."""
        return self.filter(planning_area=planning_area, created_by=user)


class ClimateForesightRunStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    RUNNING = "running", "Running"
    DONE = "done", "Done"


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


class ClimateForesightPillar(CreatedAtMixin, models.Model):
    """
    Represents pillars for organizing climate foresight data layers.

    Global pillars (null run_id) represent the 10 pillars of fire resilience and cannot be deleted.
    Run-specific pillars are custom pillars created by users and can only be deleted
    when the run is in draft mode.
    """

    run_id = models.ForeignKey(
        ClimateForesightRun,
        on_delete=models.CASCADE,
        related_name="custom_pillars",
        null=True,
        blank=True,
        db_column="run_id",
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
                condition=models.Q(run_id__isnull=True),
                name="unique_global_climate_foresight_pillar_name",
            ),
            models.UniqueConstraint(
                fields=["run_id", "name"],
                condition=models.Q(run_id__isnull=False),
                name="unique_run_climate_foresight_pillar_name",
            ),
        ]

    def __str__(self):
        scope = "Custom" if self.is_custom else "Global"
        return f"{self.name} ({scope})"

    @property
    def is_custom(self) -> bool:
        """Returns True if this is a custom (run-specific) pillar."""
        return self.run_id is not None

    def can_delete(self) -> bool:
        """
        Determines if this pillar can be deleted.

        Global pillars cannot be deleted.
        Run-specific pillars can only be deleted if the run is in draft mode.
        """
        if not self.is_custom:
            return False
        return self.run_id.status == ClimateForesightRunStatus.DRAFT

    def clean(self):
        """Clean the pillar."""
        super().clean()


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

    pillar_id = models.ForeignKey(
        ClimateForesightPillar,
        on_delete=models.PROTECT,
        null=True,
        db_column="pillar_id",
        related_name="datalayer_assignments",
        help_text="Optional pillar assignment for this data layer",
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
        help_text="Statistics calculated from clipped planning area: {min, max, mean, std, count, percentiles: {p5, p10, p90, p95}}",
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
        return f"{self.run.name} - {self.datalayer.name} ({self.pillar})"
