import math

from conditions.models import Condition
from django.contrib.auth.models import User
from django.contrib.gis.db import models


class Plan(models.Model):
    """
    A Plan is associated with one owner and one Region.
    It contains a geometry representing the planning area.
    """
    # TODO: Change "null=True" so that owner is not nullable. Currently owner can be null because
    # we want alpha users to not be signed in.
    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True)  # type: ignore

    # The name of the plan.
    name: models.CharField = models.CharField(max_length=120)

    # The region_name for the plan; should be one of the valid region names in base.region_names.
    region_name: models.CharField = models.CharField(max_length=120)

    # Whether the plan has been made "public".
    public: models.BooleanField = models.BooleanField(null=True, default=False)

    # Whether the plan has been "locked".
    locked: models.BooleanField = models.BooleanField(null=True, default=False)

    # The planning area of the plan.
    geometry = models.MultiPolygonField(srid=4269, null=True)

    # The creation time of the plan, automatically set when the plan is created.
    creation_time: models.DateTimeField = models.DateTimeField(
        null=True, auto_now_add=True)


class Project(models.Model):
    """
    A Config is associated with one owner and one Plan.
    A Config contains user-specified parameters, constraints and priorities, used in a Forsys run.
    """
    # TODO: Change "null=True" so that owner is not nullable. Currently owner
    # can be null because we want alpha users to not be signed in.
    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True)  # type: ignore

    plan = models.ForeignKey(Plan, on_delete=models.CASCADE)  # type: ignore

    # The creation time of the project, automatically set when the project is
    # created.
    creation_time: models.DateTimeField = models.DateTimeField(
        null=True, auto_now_add=True)

    # Parameters:
    # TODO: Limit number of allowed priorities
    priorities = models.ManyToManyField(
        'conditions.Condition', through='ConfigPriority')  # type: ignore

    # Max constraints. If null, no max value unless a system default is defined.
    # In USD
    max_budget: models.FloatField = models.FloatField(null=True)

    # Ratio of treatment area to planning area
    max_treatment_area_ratio: models.FloatField = models.FloatField(null=True)

    # In miles
    max_road_distance: models.FloatField = models.FloatField(null=True)

    # Ratio of elevation to distance
    max_slope: models.FloatField = models.FloatField(null=True)

    # Maximum cost per project in USD
    max_cost_per_project_in_usd: models.FloatField = models.FloatField(null=True)

    # Maximum area per project in km2
    max_area_per_project_in_km2: models.FloatField = models.FloatField(null=True)


class ConfigPriority(models.Model):
    # TODO: migrate to Config
    project = models.ForeignKey(Project, on_delete=models.CASCADE, null=False)

    condition = models.ForeignKey(
        'conditions.Condition', on_delete=models.CASCADE)


class Scenario(models.Model):
    """
    A Scenario is associated with one owner, one Plan, and one Project.
    It contains user specified fields like 'notes'.
    """
    # TODO: Change "null=True" so that owner is not nullable. Currently owner can be null because
    # we want alpha users to not be signed in.
    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True)  # type: ignore

    plan = models.ForeignKey(
        Plan, on_delete=models.CASCADE, null=False)  # type: ignore

    # TODO: convert to null=False id used for API is determined
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, null=True)  # type: ignore

    # The creation time of the project, automatically set when the project is created.
    creation_time: models.DateTimeField = models.DateTimeField(
        null=True, auto_now_add=True)

    notes: models.TextField = models.TextField(null=True)

    favorited: models.BooleanField = models.BooleanField(
        null=True, default=False)

    class ScenarioStatus(models.IntegerChoices):
        INITIALIZED = 0
        PENDING = 1
        PROCESSING = 2
        SUCCESS = 3
        FAILED = 4

    status = models.IntegerField(
        choices=ScenarioStatus.choices, default=ScenarioStatus.INITIALIZED)


class ScenarioWeightedPriority(models.Model):
    """
    Assigns a weight to a ConfigPriority for a given Scenario.
    """
    scenario = models.ForeignKey(
        Scenario, on_delete=models.CASCADE)  # type: ignore

    priority = models.ForeignKey(
        'conditions.Condition', on_delete=models.CASCADE, null=True)

    weight: models.IntegerField = models.IntegerField(null=True)


class ProjectArea(models.Model):
    """
    ProjectAreas are associated with one owner and one Project. 
    Each ProjectArea has geometries representing the project area.
    A ProjectArea may be included in a Scenario via the RankedProjectArea table.
    """
    # TODO: Change "null=True" so that owner is not nullable. Currently owner can be null because
    # we want alpha users to not be signed in.
    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True)  # type: ignore

    project = models.ForeignKey(
        Project, on_delete=models.CASCADE)  # type: ignore

    # The project area geometries. May be one or more polygons that represent a single project area.
    project_area = models.MultiPolygonField(srid=4269, null=True)

    # The sum total of the project area geometries.
    estimated_area_treated: models.IntegerField = models.IntegerField(
        null=True)


class RankedProjectArea(models.Model):
    """
    RankedProjectArea associates a ProjectArea with a Scenario.
    Contains Planscape generated fields: rank, score.
    """
    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE)

    project_area = models.ForeignKey(ProjectArea, on_delete=models.CASCADE)

    rank = models.IntegerField()

    weighted_score = models.FloatField()


class ConditionScores(models.Model):
    """
    Condition scores are computed from statistics aggregated across all
    relevant stands within a project area or planning area.
    """
    # Either plan or project should be present.
    plan = models.ForeignKey(
        Plan, on_delete=models.CASCADE, null=True)  # type: ignore
    project_area = models.ForeignKey(
        ProjectArea, on_delete=models.CASCADE, null=True)  # type: ignore

    # Condition
    condition = models.ForeignKey(
        Condition, on_delete=models.CASCADE, null=False)  # type: ignore

    # The following are condition statistics computed across relevant raster
    # pixels within a project or planning area.
    # If plan or project area geometry has no intersection with non-nan raster
    # pixels, mean_score=None, sum=0, and count=0.
    mean_score = models.FloatField(null=True)
    sum = models.FloatField(null=True)
    count = models.IntegerField(null=True)
