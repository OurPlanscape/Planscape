import math

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


class Project(models.Model):
    """
    A Project is associated with one User, the owner, and one Plan. It has optional user-specified
    project parameters, e.g. constraints.
    """
    # TODO: Change "null=True" so that owner is not nullable. Currently owner can be null because
    # we want alpha users to not be signed in.
    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True)  # type: ignore

    plan = models.ForeignKey(Plan, on_delete=models.CASCADE)  # type: ignore

    # Project Parameters:

    # The maximum cost constraint. If null, no max cost.
    max_cost: models.IntegerField = models.IntegerField(null=True)

    # TODO: Add more project parameters like min_acres_treated and
    # permitted_ownership = (1=federal, 2=state, 4=private)

class GeneratedProjectAreas(models.Model):
    """
    GeneratedProjectAreas are associated with one Project. It has geometries representing 
    the project area, and an estimate of the area treated.
    """
    project = models.ForeignKey(
        Project, on_delete=models.CASCADE)  # type: ignore

    # The project area geometries. May be one or more polygons that represent the project area.
    project_area = models.MultiPolygonField(srid=4269, null=True)

    # The sum total of the project area geometries.
    estimated_area_treated: models.IntegerField = models.IntegerField(
        null=True)


class ScenarioSet(models.Model):
    # TODO: Change "null=True" so that owner is not nullable. Currently owner can be null because
    # we want alpha users to not be signed in.
    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True)  # type: ignore

    project = models.ForeignKey(
        Project, on_delete=models.CASCADE)  # type: ignore

    # Scenario Parameters:

    # TODO: Limit number of allowed priorities
    priorities = models.ManyToManyField('conditions.Condition')

    # TODO: Add constraints


class Scenario(models.Model):
    """
    A Scenario is associated with one User, the owner, and one Project. It has optional user-specified
    prioritization parameters.
    """
    # TODO: Change "null=True" so that owner is not nullable. Currently owner can be null because
    # we want alpha users to not be signed in.
    owner = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True)  # type: ignore

    project = models.ForeignKey(
        Project, on_delete=models.CASCADE)  # type: ignore

    # TODO: Change null=True once schema is finalized. Existing entries in the Scenario table do not have this field set.
    scenario_set = models.ForeignKey(
        ScenarioSet, on_delete=models.CASCADE, null=True)

    # TODO: Add project area ranking

    # TODO: Add flag to indicate whether this was a 'selected' scenario
