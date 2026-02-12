import json
import logging
import uuid
from pathlib import Path
from typing import Collection, Optional

from collaboration.models import UserObjectRole
from core.gcs import create_download_url
from core.models import (
    AliveObjectsManager,
    CreatedAtMixin,
    DeletedAtMixin,
    UpdatedAtMixin,
    UUIDMixin,
)
from datasets.models import DataLayer, DataLayerType
from django.conf import settings
from django.contrib.auth.models import User
from django.contrib.contenttypes.models import ContentType
from django.contrib.gis.db import models
from django.contrib.gis.db.models import Union as UnionOp
from django.contrib.gis.geos import GEOSGeometry
from django.contrib.postgres.fields import ArrayField
from django.core.serializers.json import DjangoJSONEncoder
from django.core.validators import MinValueValidator
from django.db.models import F, Q, QuerySet
from django.utils.functional import cached_property
from django_stubs_ext.db.models import TypedModelMeta
from stands.models import Stand, StandSizeChoices
from utils.uuid_utils import generate_short_uuid

logger = logging.getLogger(__name__)


class ScenarioCapability(models.TextChoices):
    FORSYS = ("FORSYS", "Forsys")
    IMPACTS = ("IMPACTS", "Impacts")
    MAP = ("MAP", "Map")
    CLIMATE_FORESIGHT = ("CLIMATE_FORESIGHT", "Climate Foresight")


class PlanningAreaManager(AliveObjectsManager):
    def list_by_user(self, user: User) -> QuerySet:
        content_type_pk = ContentType.objects.get(model="planningarea").pk
        qs = super().get_queryset()

        ids = (
            qs.filter(
                Q(user=user)
                | Q(
                    pk__in=UserObjectRole.objects.filter(
                        collaborator_id=user, content_type_id=content_type_pk
                    ).values_list("object_pk", flat=True)
                )
            )
            .values_list("id", flat=True)
            .distinct("id")
            .order_by("id")
        )
        return super().get_queryset().filter(id__in=ids)

    def list_for_api(self, user: User) -> QuerySet:
        queryset = PlanningArea.objects.list_by_user(user).annotate(
            latest_updated=F("updated_at")
        )
        return queryset


class RegionChoices(models.TextChoices):
    SIERRA_NEVADA = "sierra-nevada", "Sierra Nevada"
    SOUTHERN_CALIFORNIA = "southern-california", "Southern California"
    CENTRAL_COAST = "central-coast", "Central Coast"
    NORTHERN_CALIFORNIA = "northern-california", "Northern California"


class PlanningAreaMapStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    STANDS_DONE = "STANDS_DONE", "Stands Done"
    DONE = "DONE", "Done"
    FAILED = "FAILED", "Failed"
    OVERSIZE = "OVERSIZE", "Oversize"


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
        null=True,
    )

    name = models.CharField(max_length=120, help_text="Name of the Planning Area.")

    notes = models.TextField(null=True, help_text="Notes of the Planning Area.")

    geometry = models.MultiPolygonField(
        srid=settings.DEFAULT_CRS,
        null=True,
        help_text="Geometry of the Planning Area represented by polygons.",
    )

    map_status = models.CharField(
        choices=PlanningAreaMapStatus.choices,
        null=True,
        help_text="Controls the status of all the processes needed to allow the dynamic map to work.",
    )

    capabilities = ArrayField(
        base_field=models.CharField(max_length=32, choices=ScenarioCapability.choices),
        default=list,
        blank=True,
        help_text="List of enabled capabilities for this Planning Area.",
    )

    scenario_count = models.IntegerField(null=True)

    stands_ready_at = models.DateTimeField(null=True)
    metrics_ready_at = models.DateTimeField(null=True)

    def creator_name(self) -> str:
        return self.user.get_full_name()

    def get_stands(self, stand_size) -> QuerySet[Stand]:
        """
        Returns the list of stands inside that planning area."""
        return Stand.objects.within_polygon(self.geometry, stand_size)

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
    DRAFT = "DRAFT", "Draft"


class ScenarioManager(AliveObjectsManager):
    def list_by_user(self, user: Optional[User]):
        if not user:
            return self.get_queryset().none()
        # this will become super slow when the database gets bigger
        planning_areas = PlanningArea.objects.list_by_user(user).values_list(
            "id", flat=True
        )
        return self.get_queryset().filter(planning_area__id__in=planning_areas)


class ScenarioPlanningApproach(models.TextChoices):
    PRIORITIZE_SUB_UNITS = "PRIORITIZE_SUB_UNITS", "Prioritize Sub-Units"
    OPTIMIZE_PROJECT_AREAS = "OPTIMIZE_PROJECT_AREAS", "Optimize Project Areas"

class ScenarioOrigin(models.TextChoices):
    # project comes from optimization algorithm, such as forsys
    SYSTEM = "SYSTEM", "System"
    # project comes from direct user creation / import
    USER = "USER", "User"


class ScenarioType(models.TextChoices):
    PRESET = "PRESET", "Preset"
    CUSTOM = "CUSTOM", "Custom"


class ScenarioVersion(models.TextChoices):
    # Legacy version (v1) treatment goals are stored in the configuration field.
    V1 = "V1", "Version 1"
    # New version (v2) treatment goals are stored in the TreatmentGoal model.
    V2 = "V2", "Version 2"
    # New version (v3) introduces the 'draft' configuration structure (targets, constraints).
    V3 = "V3", "Version 3"


class TreatmentGoalCategory(models.TextChoices):
    FIRE_DYNAMICS = "FIRE_DYNAMICS", "Fire Dynamics"
    BIODIVERSITY = "BIODIVERSITY", "Biodiversity"
    CARBON_BIOMASS = "CARBON_BIOMASS", "Carbon/Biomass"


class TreatmentGoalGroup(models.TextChoices):
    CALIFORNIA_PLANNING_METRICS = (
        "CALIFORNIA_PLANNING_METRICS",
        "California Landscape Metrics",
    )
    PYROLOGIX = ("PYROLOGIX", "Pyrologix")
    RISK_BASED_STRATEGIC_PLANNING = (
        "RISK_BASED_STRATEGIC_PLANNING",
        "Risk-Based Strategic Planning",
    )
    TREEMAP_FVS_2020 = ("TREEMAP_FVS_2020", "TreeMap FVS 2020")
    WILDFIRE_RISK_TO_COMMUTIES = (
        "WILDFIRE_RISK_TO_COMMUTIES",
        "Wildfire Risk to Communities",
    )


class TreatmentGoal(CreatedAtMixin, UpdatedAtMixin, DeletedAtMixin, models.Model):
    id: int
    name = models.CharField(max_length=120, help_text="Name of the Treatment Goal.")
    description = models.TextField(null=True, help_text="Treatment Goal description.")
    priorities = models.JSONField(
        null=True, help_text="Treatment Goal priorities.", encoder=DjangoJSONEncoder
    )
    stand_thresholds = models.JSONField(
        null=True,
        help_text="Treatment Goal stand thresholds.",
        encoder=DjangoJSONEncoder,
    )
    active = models.BooleanField(
        default=True, help_text="Treatment Goal active status."
    )
    category = models.CharField(
        max_length=32,
        choices=TreatmentGoalCategory.choices,
        help_text="Treatment Goal category.",
        null=True,
    )
    group = models.CharField(
        max_length=64,
        choices=TreatmentGoalGroup.choices,
        help_text="Treatment Goal group.",
        null=True,
    )
    created_by_id: int
    created_by = models.ForeignKey(
        User,
        related_name="created_treatment_goals",
        on_delete=models.RESTRICT,
        null=True,
    )

    datalayers: models.ManyToManyField[DataLayer, models.Model] = (
        models.ManyToManyField(
            to=DataLayer,
            through="TreatmentGoalUsesDataLayer",
            through_fields=(
                "treatment_goal",
                "datalayer",
            ),
        )
    )

    geometry = models.MultiPolygonField(
        srid=settings.DEFAULT_CRS,
        null=True,
        help_text="Stores the bounding box that represents the union of all available layers. all planning areas must be inside this polygon.",
    )

    @cached_property
    def active_datalayers(self) -> Collection[DataLayer]:
        return self.datalayers.filter(used_by_treatment_goals__deleted_at__isnull=True)

    def get_coverage(self) -> GEOSGeometry:
        return self.active_datalayers.all().geometric_intersection(
            geometry_field="outline"
        )  # type: ignore

    def get_raster_datalayers(self) -> Collection[DataLayer]:
        datalayers = list(
            self.active_datalayers.exclude(
                used_by_treatment_goals__usage_type=TreatmentGoalUsageType.EXCLUSION_ZONE,
            ).filter(type=DataLayerType.RASTER)
        )

        for name in ["slope", "distance_from_roads"]:
            datalayer = DataLayer.objects.all().by_meta_name(name=name)
            if datalayer:
                datalayers.append(datalayer)
        return datalayers

    def __str__(self):
        return f"{self.name} - {self.category}"


class TreatmentGoalUsageType(models.TextChoices):
    PRIORITY = "PRIORITY", "Priority"
    SECONDARY_METRIC = "SECONDARY_METRIC", "Secondary Metric"
    THRESHOLD = "THRESHOLD", "Threshold"
    EXCLUSION_ZONE = "EXCLUSION_ZONE", "Exclusion Zone"
    INCLUSION_ZONE = "INCLUSION_ZONE", "Inclusion Zone"


class TreatmentGoalUsesDataLayer(
    CreatedAtMixin, UpdatedAtMixin, DeletedAtMixin, models.Model
):
    id: int
    treatment_goal_id: int
    treatment_goal = models.ForeignKey(
        TreatmentGoal,
        related_name="datalayer_usages",
        on_delete=models.CASCADE,
    )
    datalayer_id: int
    datalayer = models.ForeignKey(
        DataLayer,
        related_name="used_by_treatment_goals",
        on_delete=models.CASCADE,
    )
    usage_type = models.CharField(
        max_length=32,
        choices=TreatmentGoalUsageType.choices,
        help_text="The type of usage for the data layer.",
    )
    threshold = models.CharField(
        max_length=256,
        null=True,
        help_text="Threshold for the data layer.",
    )
    weight = models.PositiveIntegerField(
        null=True,
        validators=[MinValueValidator(1)],
        help_text="Only applies when Usage Type = PRIORITY. Must be a positive integer (>= 1).",
    )

    @property
    def treatment_goal_name(self):
        return self.treatment_goal.name

    @property
    def datalayer_name(self):
        return self.datalayer.name

    def __str__(self):
        return f"{self.usage_type} ({self.treatment_goal} - {self.datalayer})"

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["treatment_goal", "datalayer", "usage_type"],
                name="unique_treatment_goal_datalayer_usage_type",
                condition=Q(deleted_at=None),
            )
        ]


class GeoPackageStatus(models.TextChoices):
    SUCCEEDED = ("SUCCEEDED", "Succeeded")
    PROCESSING = ("PROCESSING", "Processing")
    PENDING = ("PENDING", "Pending")
    FAILED = ("FAILED", "Failed")


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

    type = models.CharField(
        choices=ScenarioType.choices,
        max_length=16,
        null=True,
        blank=True,
        help_text="Scenario type.",
    )

    planning_approach = models.CharField(
        choices=ScenarioPlanningApproach.choices,
        max_length=32,
        null=True,
        blank=True,
        help_text="Scenario's Planning Approach.",
    )

    notes = models.TextField(null=True, help_text="Scenario notes.")

    configuration = models.JSONField(default=dict, help_text="Scenario configuration.")

    forsys_input = models.JSONField(
        null=True,
        help_text="Forsys input data for the Scenario.",
        encoder=DjangoJSONEncoder,
    )

    capabilities = ArrayField(
        base_field=models.CharField(max_length=32, choices=ScenarioCapability.choices),
        default=list,
        blank=True,
        help_text="List of enabled capabilities for this Scenario.",
    )

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

    geopackage_status = models.CharField(
        max_length=32,
        choices=GeoPackageStatus.choices,
        null=True,
        help_text="Result status of the generation of a geopackage.",
    )

    treatment_goal = models.ForeignKey(
        TreatmentGoal,
        related_name="treatment_goals",
        on_delete=models.RESTRICT,
        null=True,
        help_text="Treatment Goal of the Scenario.",
    )

    geopackage_url = models.URLField(
        null=True,
        help_text="Geopackage URL of the Scenario.",
    )

    ready_email_sent_at = models.DateTimeField(
        null=True, help_text="When the ready email was sent."
    )

    @cached_property
    def version(self):
        cfg = self.configuration or {}
        if "targets" in cfg:
            return ScenarioVersion.V3
        if "question_id" in cfg:
            return ScenarioVersion.V1
        return ScenarioVersion.V2

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

    def get_geopackage_url(self) -> Optional[str]:
        if not self.geopackage_url:
            logger.warning("No geopackage url ready yet")
            return None
        signed_url = create_download_url(
            self.geopackage_url,
            bucket_name=settings.GCS_MEDIA_BUCKET,
        )
        logger.info("PUBLIC URL GENERATED %s", signed_url)
        return signed_url
    
    def get_raster_datalayers(self) -> Collection[DataLayer]:
        if self.type == ScenarioType.CUSTOM:
            priority_objectives = self.configuration.get("priority_objectives", [])
            cobenefits = self.configuration.get("cobenefits", [])
            datalayer_ids = priority_objectives + cobenefits
            datalayers = DataLayer.objects.filter(id__in=datalayer_ids).filter(type=DataLayerType.RASTER)
            datalayers = list(datalayers)
            
            for name in ["slope", "distance_from_roads"]:
                datalayer = DataLayer.objects.all().by_meta_name(name=name)
                if datalayer:
                    datalayers.append(datalayer)

            return datalayers
        else:
            return self.treatment_goal.get_raster_datalayers() # type: ignore

    objects = ScenarioManager()

    class Meta(TypedModelMeta):
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "planning_area",
                    "name",
                ],
                name="unique_scenario",
                condition=Q(deleted_at=None),
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
        srid=settings.DEFAULT_CRS,
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
