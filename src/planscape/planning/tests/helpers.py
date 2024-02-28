from django.contrib.auth.models import User
from django.contrib.gis.geos import GEOSGeometry
from collaboration.models import Permissions, Role
from planning.models import PlanningArea, Scenario, ScenarioResult


# Create test plans.  These are going straight to the test DB without
# normal parameter checking (e.g. if is there a real geometry).
# Always use a Sierra Nevada region.
def _create_planning_area(
    user: User,
    name: str,
    geometry: GEOSGeometry | None = None,
    notes: str | None = None,
) -> PlanningArea:
    """
    Creates a planning_area with the given user, name, geometry, notes.  All regions
    are in Sierra Nevada.
    """
    planning_area = PlanningArea.objects.create(
        user=user,
        name=name,
        region_name="sierra-nevada",
        geometry=geometry,
        notes=notes,
    )
    planning_area.save()
    return planning_area


# Blindly create a scenario and a scenario result in its default (pending) state.
# Note that this does no deduplication, which our APIs may eventually do.
def _create_scenario(
    planning_area: PlanningArea,
    scenario_name: str,
    configuration: str,
    user: User,
    notes: str | None = None,
) -> Scenario:
    scenario = Scenario.objects.create(
        planning_area=planning_area,
        name=scenario_name,
        configuration=configuration,
        notes=notes,
        user=user,
    )
    scenario.save()

    scenario_result = ScenarioResult.objects.create(scenario=scenario)
    scenario_result.save()

    return scenario


def reset_permissions():
    viewer = ["view_planningarea", "view_scenario"]
    collaborator = viewer + ["add_scenario"]
    owner = collaborator + [
        "change_scenario",
        "view_collaborator",
        "add_collaborator",
        "delete_collaborator",
        "change_collaborator",
    ]
    for x in viewer:
        entry = Permissions.objects.create(role=Role.VIEWER, permission=x)
        entry.save()

    for x in collaborator:
        entry = Permissions.objects.create(role=Role.COLLABORATOR, permission=x)
        entry.save()

    for x in owner:
        entry = Permissions.objects.create(role=Role.OWNER, permission=x)
        entry.save()
