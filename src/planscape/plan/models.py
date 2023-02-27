import math

from conditions.models import Condition
from django.contrib.auth.models import User
from django.contrib.gis.db import models


class Plan(models.Model):
    """
    A Plan is associated with one User, the owner, and one Region.  It has a name,
    status (locked/public), and a geometry representing the planning area.
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


# TODO: delete Project (and replace with Config throughout).
class Project(models.Model):
    """
    A Project contains user-specified parameters (e.g. global constraints) used
    to inform a forsys run.
    A Project is associated with one User, the owner, and one Plan.
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

    # Project Parameters:

    # TODO: Limit number of allowed priorities
    priorities = models.ManyToManyField('conditions.Condition')  # type: ignore

    # Max constraints. If null, no max value unless a system default is defined.
    # In USD
    max_budget: models.FloatField = models.FloatField(null=True)

    # Ratio of treatment area to planning area
    max_treatment_area_ratio: models.FloatField = models.FloatField(null=True)

    # In miles
    max_road_distance: models.FloatField = models.FloatField(null=True)

    # Ratio of elevation to distance
    max_slope: models.FloatField = models.FloatField(null=True)


class Config(models.Model):
    """
    A Config contains user-specified parameters (e.g. global constraints) used
    to inform a forsys run.
    A Config is associated with one User, the owner, and one Plan.
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

    # Project Parameters:

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


class ConfigPriority(models.Model):
    project = models.ForeignKey(Config, on_delete=models.CASCADE, null=False)
    priority = models.ForeignKey(
        'conditions.Condition', on_delete=models.CASCADE, null=False)


class Scenario(models.Model):
    """
    A Scenario is associated with one User, the owner, and one Project. It has optional user-specified
    prioritization parameters.
    """
    # TODO: Change "null=True" so that owner is not nullable. Currently owner can be null because
    # we want alpha users to not be signed in.
    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True)  # type: ignore

    plan = models.ForeignKey(
        Plan, on_delete=models.CASCADE, null=True)  # type: ignore

    # The creation time of the project, automatically set when the project is created.
    creation_time: models.DateTimeField = models.DateTimeField(
        null=True, auto_now_add=True)

    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, null=True)  # type: ignore

    notes: models.TextField = models.TextField(null=True)

    favorited: models.BooleanField = models.BooleanField(null=True, default=False)
    

class ScenarioWeightedPriority(models.Model):
    """
    Assigns a weight for a Priority used an input to a Scenario. 
    """
    scenario = models.ForeignKey(
        Scenario, on_delete=models.CASCADE)  # type: ignore

    # TODO: swap with config priority in schema migration
    priority = models.ForeignKey('conditions.Condition',
                                 on_delete=models.CASCADE)  # type: ignore
    weighted_priority = models.ForeignKey(
        ConfigPriority, on_delete=models.CASCADE, null=True)

    weight: models.IntegerField = models.IntegerField(null=True)


class ProjectArea(models.Model):
    """
    ProjectAreas are associated with one User, the owner, and one Project. Each
    ProjectArea has geometries representing the project area, and an estimate
    of the area treated.
    """
    # TODO: Change "null=True" so that owner is not nullable. Currently owner can be null because
    # we want alpha users to not be signed in.
    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True)  # type: ignore

    project = models.ForeignKey(
        Project, on_delete=models.CASCADE)  # type: ignore

    # Some Scenarios may share the same ProjectAreas. If the project is populated, but the scenario field is
    # not, assume that this ProjectArea is selected for all scenarios.
    scenario = models.ForeignKey(
        Scenario, on_delete=models.CASCADE, null=True)  # type: ignore

    # The project area geometries. May be one or more polygons that represent a single project area.
    project_area = models.MultiPolygonField(srid=4269, null=True)

    # The sum total of the project area geometries.
    estimated_area_treated: models.IntegerField = models.IntegerField(
        null=True)

class RankedProjectArea(models.Model):
    """
    Given config constraints and scenario weights, project areas are scored and 
    ranked.
    This contains the score and rank of a specific project area for a specific 
    scenario.
    """
    project_area = models.ForeignKey(ProjectArea, on_delete=models.CASCADE)
    scenario = models.ForeignKey(Scenario, on_delete=models.CASCADE)

    rank = models.IntegerField()
    score = models.FloatField()

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
