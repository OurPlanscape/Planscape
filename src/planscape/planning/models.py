from pathlib import Path
from django.contrib.gis.db import models
from django.contrib.auth import get_user_model
from django.conf import settings
from utils.uuid_utils import generate_short_uuid
from django.core.serializers.json import DjangoJSONEncoder
from core.models import CreatedAtMixin, UpdatedAtMixin
from django.contrib.contenttypes.models import ContentType
from django.utils.translation import gettext_lazy as _
import uuid

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

    notes = models.TextField(null=True)

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

    notes = models.TextField(null=True)

    configuration = models.JSONField(default=dict)

    uuid = models.UUIDField(default=uuid.uuid4, unique=True)

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

class Role(models.TextChoices):
    CREATOR = "Creator"
    OWNER = 'Owner'
    COLLABORATOR = 'Collaborator'
    VIEWER = 'Viewer'
    
class Permissions(models.Model):
    role = models.CharField(
        choices=Role.choices,
        max_length=16,
        default=Role.VIEWER,
    )
    permission = models.CharField(max_length=60)
    class Meta:
        constraints = [
            # a person can only be invited once to a specific planning area
            models.UniqueConstraint(
                fields=[
                    "role",
                    "permission"
                ],
                name="unique_permission",
            )
        ]

class Collaborator(models.Model):
    uuid = models.UUIDField(default=uuid.uuid4, unique=True)
    # the email address invited to collaborate
    email = models.CharField(max_length=120)
    # the user that is being added as collaborator
    # might be empty if no user is found with the email
    collaborator = models.ForeignKey(
        User,
        related_name="collaborator",
        on_delete=models.CASCADE,
        null=True,
    )
    # the role assigned 
    role = models.CharField(
        choices=Role.choices,
        max_length=16,
        default=Role.VIEWER,
    )
    # the user that invited the collaborator
    inviter = models.ForeignKey(
        User,
        related_name="inviter",
        on_delete=models.CASCADE,
        null=False,
    )
    # use content types to potentially save other things that are not only planning_areas
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_pk = models.CharField(_('object ID'), max_length=255)

    class Meta:
        constraints = [
            # a person can only be invited once to a specific planning area
            models.UniqueConstraint(
                fields=[
                    "email",
                    "content_type",
                    "object_pk",
                ],
                name="unique_collaborator",
            )
        ]
     