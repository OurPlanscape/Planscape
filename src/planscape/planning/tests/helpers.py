from django.contrib.auth.models import User
from django.contrib.gis.geos import GEOSGeometry
from collaboration.models import Permissions, Role
from planning.models import PlanningArea, Scenario, ScenarioResult, ScenarioStatus


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
    from planning.models import RegionChoices

    planning_area = PlanningArea.objects.create(
        user=user,
        name=name,
        region_name=RegionChoices.SIERRA_NEVADA,
        geometry=geometry,
        notes=notes,
    )
    planning_area.save()
    return planning_area


def _create_multiple_planningareas(
    count: int,
    user: User,
    name_prefix: str,
    geometry: GEOSGeometry | None = None,
    notes: str | None = None,
):
    created_planningareas = []

    for s in range(0, count):
        created_planningareas.append(
            _create_planning_area(
                user=user,
                name=f"{name_prefix} {s}",
                geometry=geometry,
                notes=notes,
            )
        )
    return created_planningareas


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


def _create_multiple_scenarios(
    count: int,
    planning_area: PlanningArea,
    name_prefix: str,
    configuration: str,
    user: User,
):
    created_scenarios = []

    for s in range(0, count):
        created_scenarios.append(
            _create_scenario(
                planning_area=planning_area,
                scenario_name=f"{name_prefix} {s}",
                configuration=configuration,
                user=user,
                notes="",
            )
        )
    return created_scenarios


def _create_test_user_set():
    owner_user = User.objects.create(
        username="area_owner",
        first_name="Oliver",
        last_name="Owner",
        email="owner1@test.test",
    )
    owner_user.set_password("12345")
    owner_user.save()

    owner_user2 = User.objects.create(
        username="area2_owner",
        first_name="Olga",
        last_name="Owner",
        email="owner2@test.test",
    )
    owner_user2.set_password("12345")
    owner_user2.save()

    collab_user = User.objects.create(
        username="area_collab",
        first_name="Chris",
        last_name="Collab",
        email="collab@test.test",
    )
    collab_user.set_password("12345")
    collab_user.save()

    viewer_user = User.objects.create(
        username="area_viewer",
        first_name="Veronica",
        last_name="Viewer",
        email="viewer@test.test",
    )
    viewer_user.set_password("12345")
    viewer_user.save()

    unprivileged_user = User.objects.create(
        username="justauser",
        first_name="Ned",
        last_name="Nobody",
        email="user@test.test",
    )
    unprivileged_user.set_password("12345")
    unprivileged_user.save()
    return {
        "owner": owner_user,
        "owner2": owner_user2,
        "collaborator": collab_user,
        "viewer": viewer_user,
        "unprivileged": unprivileged_user,
    }


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
