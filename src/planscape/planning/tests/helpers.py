import json
import os
from django.contrib.auth.models import User
from collaboration.models import Permissions, Role
from planning.models import (
    PlanningArea,
    Scenario,
    ScenarioResult,
    ScenarioStatus,
)


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
        status=ScenarioStatus.ACTIVE,
    )
    scenario.save()

    scenario_result = ScenarioResult.objects.create(scenario=scenario)
    scenario_result.save()

    return scenario


def _load_geojson_fixture(filename):
    current_dir = os.path.dirname(os.path.abspath(__file__))
    fixture_path = os.path.join(current_dir, "../fixtures", filename)
    with open(fixture_path, "r") as file:
        return json.load(file)


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
