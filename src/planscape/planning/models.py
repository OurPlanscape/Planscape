from pathlib import Path
from django.contrib.gis.db import models
from django.contrib.auth import get_user_model
from django.conf import settings
from collaboration.models import Collaborator, Permissions
from utils.uuid_utils import generate_short_uuid
from django.core.serializers.json import DjangoJSONEncoder
from core.models import CreatedAtMixin, UpdatedAtMixin
import uuid
from django.contrib.auth.models import User
from collaboration.permissions import CheckPermissionMixin
from collaboration.utils import check_for_permission
from django.contrib.contenttypes.models import ContentType

UserModel = get_user_model()


class PlanningArea(CreatedAtMixin, UpdatedAtMixin, models.Model, CheckPermissionMixin):
    user = models.ForeignKey(
        UserModel,
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

    def is_creator(self, user: User):
        return self.user.pk == user.pk

    def can_view(self, user: User):
        if self.is_creator(user):
            return True

        return check_for_permission(user.id, self, "view_planningarea")

    def can_add(self, user: User):
        return self.is_creator(user)

    def can_change(self, user: User):
        return self.is_creator(user)

    def can_remove(self, user: User):
        return self.is_creator(user)


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

    def can_view(self, user: User):
        if self.planning_area.is_creator(user):
            return True
        return check_for_permission(user.id, self.planning_area, "view_scenario")

    def can_add(self, user: User):
        if self.planning_area.is_creator(user):
            return True
        return check_for_permission(user.id, self.planning_area, "add_scenario")

    def can_change(self, user: User):
        if self.planning_area.is_creator(user):
            return True

        return check_for_permission(user.id, self.planning_area, "change_scenario")

    def can_delete(self, user: User):
        return self.planning_area.is_creator(user) or self.user.pk == user.pk


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
        UserModel,
        related_name="shared_links",
        on_delete=models.DO_NOTHING,
        null=True,
    )

    link_code = models.CharField(max_length=10, default=generate_short_uuid)

    view_state = models.JSONField()

    class Meta:
        ordering = ["-created_at", "user"]


class PlanningAreaCollaborator(Collaborator, CheckPermissionMixin):
    def save(self, *args, **kwargs):
        self.content_type = ContentType.objects.get(
            app_label="planning", model="planningarea"
        )
        super().save(*args, **kwargs)

    def get_planning_area(self):
        return self.content_type.get_object_for_this_type(pk=self.object_pk)

    def can_view(self, user: User):
        planning_area = self.get_planning_area()
        if planning_area.is_creator(user):
            return True
        try:
            return check_for_permission(user.id, planning_area, "view_collaborator")
        except (Collaborator.DoesNotExist, Permissions.DoesNotExist):
            return False

    def can_add(self, user: User):
        planning_area = self.get_planning_area()
        if planning_area.is_creator(user):
            return True
        try:
            return check_for_permission(user.id, planning_area, "add_collaborator")
        except (Collaborator.DoesNotExist, Permissions.DoesNotExist):
            return False

    def can_change(self, user: User):
        planning_area = self.get_planning_area()
        if planning_area.is_creator(user):
            return True
        try:
            return check_for_permission(user.id, planning_area, "change_collaborator")
        except (Collaborator.DoesNotExist, Permissions.DoesNotExist):
            return False

    def can_delete(self, user: User):
        planning_area = self.get_planning_area()
        if planning_area.is_creator(user):
            return True
        try:
            return check_for_permission(user.id, planning_area, "delete_collaborator")
        except (Collaborator.DoesNotExist, Permissions.DoesNotExist):
            return False
