import json
import uuid
from pathlib import Path
from typing import Optional

from collaboration.models import UserObjectRole
from core.models import (
    AliveObjectsManager,
    CreatedAtMixin,
    DeletedAtMixin,
    UpdatedAtMixin,
    UUIDMixin,
)
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.contrib.gis.db import models
from django.contrib.gis.db.models import Union as UnionOp
from django.core.serializers.json import DjangoJSONEncoder
from django.db.models import Count, Max, Q, QuerySet
from django.db.models.functions import Coalesce
from django.utils.functional import cached_property
from django_stubs_ext.db.models import TypedModelMeta
from stands.models import StandSizeChoices, Stand
from utils.uuid_utils import generate_short_uuid

from planscape.typing import TUser

User = get_user_model()


class PlanningAreaManager(AliveObjectsManager):
    def list_by_user(self, user: TUser) -> QuerySet:
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

    def list_for_api(self, user: TUser) -> QuerySet:
        queryset = PlanningArea.objects.list_by_user(user)
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


class PlanningArea(CreatedAtMixin, UpdatedAtMixin, DeletedAtMixin, models.Model):
    id: int
    user_id: int
    user = models.ForeignKey(
        User,
        related_name="planning_areas",
        on_delete=models.CASCADE,
        null=True,
        help_text="User ID that created the Planning Area.",
    )

    region_name: models.CharField = models.CharField(
        max_length=120,
        choices=RegionChoices.choices,
        help_text="Region choice name of the Planning Area.",
    )

    name = models.CharField(max_length=120, help_text="Name of the Planning Area.")

    notes = models.TextField(null=True, help_text="Notes of the Planning Area.")

    geometry = models.MultiPolygonField(
        srid=settings.CRS_INTERNAL_REPRESENTATION,
        null=True,
        help_text="Geometry of the Planning Area represented by polygons.",
    )

    def creator_name(self) -> str:
        return self.user.get_full_name()

    objects: PlanningAreaManager = PlanningAreaManager()

    class Meta(TypedModelMeta):
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
                condition=Q(deleted_at=None),
            )
        ]
        ordering = ["user", "-created_at"]


class PlanningAreaNote(CreatedAtMixin, UpdatedAtMixin, models.Model):
    id: int
    planning_area_id: int
    planning_area = models.ForeignKey(
        PlanningArea,
        related_name="planning_area_notes",
        on_delete=models.CASCADE,
    )
    user_id: int
    user = models.ForeignKey(
        User, related_name="notes", on_delete=models.SET_NULL, null=True, blank=True
    )
    content = models.TextField(null=True)

    def user_name(self) -> str:
        return self.user.get_full_name()

    class Meta(TypedModelMeta):
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


class ScenarioResultStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    RUNNING = "RUNNING", "Running"
    SUCCESS = "SUCCESS", "Success"
    FAILURE = "FAILURE", "Failure"
    PANIC = "PANIC", "Panic"
    TIMED_OUT = "TIMED_OUT", "Timed Out"


class ScenarioManager(AliveObjectsManager):
    def list_by_user(self, user: Optional[TUser]):
        if not user:
            return self.get_queryset().none()
        # this will become super slow when the database get's bigger
        planning_areas = PlanningArea.objects.list_by_user(user).values_list(
            "id", flat=True
        )
        return self.get_queryset().filter(planning_area__id__in=planning_areas)


class ScenarioOrigin(models.TextChoices):
    # project comes from optimization algorithm, such as forsys
    SYSTEM = "SYSTEM", "System"
    # project comes from direct user creation / import
    USER = "USER", "User"


class Scenario(CreatedAtMixin, UpdatedAtMixin, DeletedAtMixin, models.Model):
    id: int
    planning_area_id: int
    planning_area = models.ForeignKey(
        PlanningArea,
        related_name="scenarios",
        on_delete=models.CASCADE,
        help_text="Planning Area ID.",
    )
    user = models.ForeignKey(
        User,
        related_name="scenarios",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="User ID that created the Scenario.",
    )

    name = models.CharField(max_length=120, help_text="Name of the Scenario.")

    origin = models.CharField(
        choices=ScenarioOrigin.choices, null=True, help_text="Scenario Origin."
    )

    notes = models.TextField(null=True, help_text="Scenario notes.")

    configuration = models.JSONField(default=dict, help_text="Scenario configuration.")

    uuid = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        help_text="Scenarion Universally Unique Identifier.",
    )

    status = models.CharField(
        choices=ScenarioStatus.choices,
        max_length=32,
        default=ScenarioStatus.ACTIVE,
        help_text="Scenario status.",
    )

    result_status = models.CharField(
        max_length=32,
        choices=ScenarioResultStatus.choices,
        null=True,
        help_text="Result status of the Scenario.",
    )

    def creator_name(self) -> str:
        return self.user.get_full_name()

    def get_shapefile_folder(self) -> Path:
        return Path(settings.OUTPUT_DIR) / "shapefile" / Path(str(self.uuid))

    def get_forsys_folder(self) -> Path:
        return Path(settings.OUTPUT_DIR) / Path(str(self.uuid))

    def get_stand_size(self) -> StandSizeChoices:
        return self.configuration.get("stand_size", {}) or StandSizeChoices.LARGE

    def get_geojson_result(self):
        features = [
            {
                "type": "Feature",
                "properties": {**project_area.data, "name": project_area.name},
                "id": project_area.id,
                "geometry": json.loads(project_area.geometry.geojson),
            }
            for project_area in self.project_areas.all()
        ]
        return {"type": "FeatureCollection", "features": features}

    def get_project_areas_stands(self) -> QuerySet[Stand]:
        project_areas = self.project_areas
        project_areas_geometry = project_areas.all().aggregate(
            geometry=UnionOp("geometry")
        )["geometry"]
        return Stand.objects.within_polygon(
            project_areas_geometry, self.get_stand_size()
        )

    objects = ScenarioManager()

    class Meta(TypedModelMeta):
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


class ScenarioResult(CreatedAtMixin, UpdatedAtMixin, DeletedAtMixin, models.Model):
    id: int
    scenario_id: int
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
        null=True, help_text="Start of the Forsys run, in UTC timezone."
    )

    completed_at = models.DateTimeField(
        null=True, help_text="End of the Forsys run, in UTC timezone."
    )

    class Meta(TypedModelMeta):
        ordering = ["scenario", "-created_at"]


class SharedLink(CreatedAtMixin, UpdatedAtMixin, models.Model):
    id: int
    user_id: int
    user = models.ForeignKey(
        User,
        related_name="shared_links",
        on_delete=models.DO_NOTHING,
        null=True,
    )

    link_code = models.CharField(max_length=10, default=generate_short_uuid)

    view_state = models.JSONField()

    class Meta(TypedModelMeta):
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
    UUIDMixin,
    CreatedAtMixin,
    UpdatedAtMixin,
    DeletedAtMixin,
    models.Model,
):
    id: int

    created_by_id: int
    created_by = models.ForeignKey(
        User,
        related_name="project_areas",
        on_delete=models.RESTRICT,
    )

    scenario_id: int
    scenario = models.ForeignKey(
        Scenario,
        related_name="project_areas",
        on_delete=models.RESTRICT,
    )

    name = models.CharField(max_length=128, help_text="Name of the Project Area.")

    data = models.JSONField(
        null=True, help_text="Project Area data from Forsys.", encoder=DjangoJSONEncoder
    )

    geometry = models.MultiPolygonField(
        srid=settings.CRS_INTERNAL_REPRESENTATION,
        help_text="Geometry of the Project Area.",
    )

    @cached_property
    def stand_count(self) -> int:
        stored_stand_count = self.data.get("stand_count") if self.data else None
        return stored_stand_count or self.get_stands().count()

    def get_stands(self) -> QuerySet[Stand]:
        scenario = self.scenario
        return Stand.objects.within_polygon(self.geometry, scenario.get_stand_size())

    class Meta(TypedModelMeta):
        verbose_name = "Project Area"
        verbose_name_plural = "Project Areas"
        constraints = [
            models.UniqueConstraint(
                fields=["scenario", "name"],
                name="scenario_name_unique_constraint",
            )
        ]


class ProjectAreaNote(CreatedAtMixin, UpdatedAtMixin, DeletedAtMixin, models.Model):
    id: int
    project_area_id: int
    project_area = models.ForeignKey(
        ProjectArea,
        related_name="project_area",
        on_delete=models.CASCADE,
    )
    # if the user is deleted, their notes are also deleted
    user_id: int
    user = models.ForeignKey(
        User,
        related_name="projectarea_notes",
        on_delete=models.CASCADE,
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
