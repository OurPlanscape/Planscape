from django.urls import path
from plan.views import (
    create_plan,
    create_project,
    create_project_area,
    create_project_areas_for_project,
    create_scenario,
    delete,
    delete_projects,
    delete_scenarios,
    favorite_scenario,
    get_plan,
    get_project,
    get_project_areas,
    get_scenario,
    get_scores,
    list_plans_by_owner,
    list_projects_for_plan,
    list_scenarios_for_plan,
    queue_forsys_lambda_prototype,
    treatment_goals_config,
    unfavorite_scenario,
    update_project,
    update_scenario,
)

app_name = "plan"

urlpatterns = [
    # Plans
    path("create/", create_plan, name="create"),
    path("delete/", delete, name="delete"),
    path("get_plan/", get_plan, name="get_plan"),
    path("list_plans_by_owner/", list_plans_by_owner, name="list_plans_by_owner"),
    path("scores/", get_scores, name="get_scores"),
    # Projects
    path("create_project/", create_project, name="create_project"),
    path("get_project/", get_project, name="get_project"),
    path(
        "list_projects_for_plan/", list_projects_for_plan, name="list_projects_for_plan"
    ),
    path("update_project/", update_project, name="update_project"),
    path("delete_projects/", delete_projects, name="delete_projects"),
    path("create_project_area/", create_project_area, name="create_project_area"),
    path(
        "create_project_areas_for_project/",
        create_project_areas_for_project,
        name="create_project_areas_for_project",
    ),
    path("get_project_areas/", get_project_areas, name="get_project_areas"),
    # Scenarios
    path(
        "treatment_goals_config/", treatment_goals_config, name="treatment_goals_config"
    ),
    path("create_scenario/", create_scenario, name="create_scenario"),
    path("update_scenario/", update_scenario, name="update_scenario"),
    path("get_scenario/", get_scenario, name="get_scenario"),
    path(
        "list_scenarios_for_plan/",
        list_scenarios_for_plan,
        name="list_scenarios_for_plan",
    ),
    path("delete_scenarios/", delete_scenarios, name="delete_scenarios"),
    path("favorite_scenario/", favorite_scenario, name="favorite_scenario"),
    path("unfavorite_scenario/", unfavorite_scenario, name="unfavorite_scenario"),
    path(
        "queue_forsys_lambda_prototype/",
        queue_forsys_lambda_prototype,
        name="queue_forsys_lambda_prototype",
    ),
]
