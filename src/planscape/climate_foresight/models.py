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

    objects = ClimateForesightRunManager()

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "Climate Foresight Run"
        verbose_name_plural = "Climate Foresight Runs"

    def __str__(self):
        return f"{self.name} - {self.planning_area.name}"


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
        help_text="True if high values are favorable, False if low values are favorable"
    )

    pillar = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="The pillar/category assignment for this layer",
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
