from pathlib import Path
from django.contrib.gis.db import models
from django.db.models import Count, Max
from django.db.models.functions import Coalesce
from django.contrib.auth import get_user_model
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models import Q
from utils.uuid_utils import generate_short_uuid
from collaboration.models import UserObjectRole
from core.models import CreatedAtMixin, UpdatedAtMixin, DeletedAtMixin, UUIDMixin
import uuid

User = get_user_model()


class PlanningAreaManager(models.Manager):
    def get_for_user(self, user):
        content_type_pk = ContentType.objects.get(model="planningarea").pk
        qs = super().get_queryset()
        filtered_qs = qs.filter(
            Q(user=user)
            | Q(
                pk__in=UserObjectRole.objects.filter(
                    collaborator_id=user, content_type_id=content_type_pk
                ).values_list("object_pk", flat=True)
            )
        )
        return filtered_qs

    def get_list_for_user(self, user):
        queryset = PlanningArea.objects.get_for_user(user)
        return (
            queryset.annotate(scenario_count=Count("scenarios", distinct=True))
            .annotate(
                scenario_latest_updated_at=Coalesce(
                    Max("scenarios__updated_at"), "updated_at"
                )
            )
            .order_by("-scenario_latest_updated_at")
        )


class RegionChoices(models.TextChoices):
    SIERRA_NEVADA = "sierra-nevada", "Sierra Nevada"
    SOUTHERN_CALIFORNIA = "southern-california", "Southern California"
    CENTRAL_COAST = "central-coast", "Central Coast"
    NORTHERN_CALIFORNIA = "northern-california", "Northern California"


class PlanningArea(CreatedAtMixin, UpdatedAtMixin, models.Model):
    user = models.ForeignKey(
        User,
        related_name="planning_areas",
        on_delete=models.CASCADE,
        null=True,
    )

    objects = PlanningAreaManager()

    region_name: models.CharField = models.CharField(
        max_length=120, choices=RegionChoices.choices
    )

    name = models.CharField(max_length=120)

    notes = models.TextField(null=True)

    geometry = models.MultiPolygonField(
        srid=settings.CRS_INTERNAL_REPRESENTATION,
        null=True,
    )

    def creator_name(self):
        return self.user.get_full_name()

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


class PlanningAreaNote(CreatedAtMixin, UpdatedAtMixin, models.Model):
    planning_area = models.ForeignKey(
        PlanningArea,
        related_name="planning_area",
        on_delete=models.CASCADE,
    )
    user = models.ForeignKey(
        User, related_name="notes", on_delete=models.SET_NULL, null=True, blank=True
    )
    content = models.TextField(null=True)

    def user_name(self):
        return self.user.get_full_name()

    class Meta:
        indexes = [
            models.Index(
                fields=[
                    "user",
                ]
            )
        ]
        ordering = ["user", "-created_at"]


class ScenarioStatus(models.TextChoices):
    ACTIVE = "ACTIVE", "Active"
    ARCHIVED = "ARCHIVED", "Archived"


class Scenario(CreatedAtMixin, UpdatedAtMixin, models.Model):
    planning_area = models.ForeignKey(
        PlanningArea,
        related_name="scenarios",
        on_delete=models.CASCADE,
    )
    user = models.ForeignKey(
        User, related_name="scenarios", on_delete=models.CASCADE, null=True, blank=True
    )

    name = models.CharField(max_length=120)

    notes = models.TextField(null=True)

    configuration = models.JSONField(default=dict)

    uuid = models.UUIDField(default=uuid.uuid4, unique=True)

    status = models.CharField(
        choices=ScenarioStatus.choices,
        max_length=32,
        default=ScenarioStatus.ACTIVE,
    )

    def creator_name(self):
        return self.user.get_full_name()

    def get_shapefile_folder(self):
        return Path(settings.OUTPUT_DIR) / "shapefile" / Path(str(self.uuid))

    def get_forsys_folder(self):
        return Path(settings.OUTPUT_DIR) / Path(str(self.uuid))

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
    PANIC = "PANIC", "Panic"
    TIMED_OUT = "TIMED_OUT", "Timed Out"


class ScenarioResult(CreatedAtMixin, UpdatedAtMixin, models.Model):
    scenario = models.OneToOneField(
        Scenario,
        related_name="results",
        on_delete=models.CASCADE,
    )

    status = models.CharField(
        choices=ScenarioResultStatus.choices,
        max_length=16,
        default=ScenarioResultStatus.PENDING,
    )

    result = models.JSONField(null=True, encoder=DjangoJSONEncoder)

    run_details = models.JSONField(null=True)

    started_at = models.DateTimeField(
        null=True, help_text="Start of the Forsys run, in UTC timezone"
    )

    completed_at = models.DateTimeField(
        null=True, help_text="End of the Forsys run, in UTC timezone"
    )

    class Meta:
        ordering = ["scenario", "-created_at"]


class SharedLink(CreatedAtMixin, UpdatedAtMixin, models.Model):
    user = models.ForeignKey(
        User,
        related_name="shared_links",
        on_delete=models.DO_NOTHING,
        null=True,
    )

    link_code = models.CharField(max_length=10, default=generate_short_uuid)

    view_state = models.JSONField()

    class Meta:
        ordering = ["-created_at", "user"]


class UserPrefs(CreatedAtMixin, UpdatedAtMixin, models.Model):
    user = models.OneToOneField("auth.User", on_delete=models.CASCADE)
    preferences = models.JSONField(blank=True, null=True)


class ProjectAreaOrigin(models.TextChoices):
    # project comes from optimization algorithm, such as forsys
    OPTIMIZATION = "OPTIMIZATION", "Optimization"
    # project comes from direct user creation / import
    USER_CREATED = "USER_CREATED", "User Created"


class ProjectArea(
    UUIDMixin, CreatedAtMixin, UpdatedAtMixin, DeletedAtMixin, models.Model
):
    created_by = models.ForeignKey(
        User,
        related_name="project_areas",
        on_delete=models.RESTRICT,
    )

    scenario = models.ForeignKey(
        Scenario,
        related_name="project_areas",
        on_delete=models.RESTRICT,
    )

    origin = models.CharField(
        choices=ProjectAreaOrigin.choices,
        default=ProjectAreaOrigin.OPTIMIZATION,
        help_text="Determines where this project area came from.",
    )

    data = models.JSONField(null=True)

    geometry = models.MultiPolygonField(
        srid=settings.CRS_INTERNAL_REPRESENTATION,
    )

    class Meta:
        verbose_name = "Project Area"
        verbose_name_plural = "Project Areas"
