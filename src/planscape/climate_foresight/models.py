from django.contrib.auth.models import User
from django.db import models
from core.models import CreatedAtMixin
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
