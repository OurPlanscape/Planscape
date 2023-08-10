from django.contrib.gis.db import models
from django.contrib.auth import get_user_model
from core.models import CreatedAtMixin, UpdatedAtMixin

User = get_user_model()


class PlanningArea(CreatedAtMixin, UpdatedAtMixin, models.Model):
    user = models.ForeignKey(
        User,
        related_name="planning_areas",
        on_delete=models.CASCADE,
        null=True,
    )

    region_name: models.CharField = models.CharField(max_length=120)

    name: models.CharField = models.CharField(max_length=120)

    geometry = models.MultiPolygonField(srid=4269, null=True)

    class Meta:
        indexes = [
            models.Index(
                fields=[
                    "user",
                ]
            )
        ]
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "user",
                    "region_name",
                    "name",
                ],
                name="unique_planning_area",
            )
        ]
        ordering = ["user", "-created_at"]


class Scenario(CreatedAtMixin, UpdatedAtMixin, models.Model):
    planning_area = models.ForeignKey(
        PlanningArea,
        related_name="scenarios",
        on_delete=models.CASCADE,
    )

    name = models.CharField(max_length=120)

    configuration = models.JSONField(default=dict)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "planning_area",
                    "name",
                ],
                name="unique_scenario",
            )
        ]
        ordering = ["planning_area", "-created_at"]


class ScenarioResultStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    RUNNING = "RUNNING", "Running"
    SUCCESS = "SUCCESS", "Success"
    FAILURE = "FAILURE", "Failure"


class ScenarioResult(CreatedAtMixin, UpdatedAtMixin, models.Model):
    scenario = models.ForeignKey(
        Scenario,
        related_name="results",
        on_delete=models.CASCADE,
    )

    status = models.CharField(
        choices=ScenarioResultStatus.choices,
        max_length=16,
        default=ScenarioResultStatus.PENDING,
    )

    result = models.JSONField(null=True)

    run_details = models.JSONField(null=True)

    class Meta:
        ordering = ["scenario", "-created_at"]
