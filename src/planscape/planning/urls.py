from django.conf.urls import include
from django.urls import path
from planning.views import (
    validate_planning_area,
    create_planning_area,
    delete_planning_area,
    get_planning_area_by_id,
    download_csv,
    download_shapefile,
    list_planning_areas,
    update_planning_area,
    create_scenario,
    delete_scenario,
    get_scenario_by_id,
    list_scenarios_for_planning_area,
    treatment_goals_config,
    update_scenario,
    update_scenario_result,
    create_shared_link,
    get_shared_link,
    PlanningAreaNotes,
)
from planning.views_userprefs import UserPreferencesView

app_name = "planning"

# TODO: Change these to more standardized id-driven APIs, e.g. scenarios/[id]

urlpatterns = [
    # Auto-generated API documentation
    path("admin/doc/", include("django.contrib.admindocs.urls")),
    # Treatment Goals
    path(
        "treatment_goals_config/", treatment_goals_config, name="treatment_goals_config"
    ),
    # Plans / Planning Areas
    path(
        "validate_planning_area/", validate_planning_area, name="validate_planning_area"
    ),
    path("create_planning_area/", create_planning_area, name="create_planning_area"),
    path("delete_planning_area/", delete_planning_area, name="delete_planning_area"),
    path(
        "get_planning_area_by_id/",
        get_planning_area_by_id,
        name="get_planning_area_by_id",
    ),
    path("list_planning_areas/", list_planning_areas, name="list_planning_areas"),
    path("update_planning_area/", update_planning_area, name="update_planning_area"),
    # Scenarios
    path("create_scenario/", create_scenario, name="create_scenario"),
    path("delete_scenario/", delete_scenario, name="delete_scenario"),
    path("get_scenario_by_id/", get_scenario_by_id, name="get_scenario_by_id"),
    path(
        # TODO change this to download_csv url
        "get_scenario_download_by_id/",
        download_csv,
        name="download_csv",
    ),
    path(
        "download_shapefile/",
        download_shapefile,
        name="download_shapefile",
    ),
    path(
        "list_scenarios_for_planning_area/",
        list_scenarios_for_planning_area,
        name="list_scenarios_for_planning_area",
    ),
    path(
        "update_scenario/",
        update_scenario,
        name="update_scenario",
    ),
    path(
        "update_scenario_result/", update_scenario_result, name="update_scenario_result"
    ),
    # Project Areas
    path(
        "create_link/",
        create_shared_link,
        name="create_shared_link",
    ),
    path(
        "shared_link/<str:link_code>",
        get_shared_link,
        name="get_shared_link",
    ),
    # Planning Area Notes C/R/D
    path(
        "planning_area/<int:planningarea_pk>/note",
        PlanningAreaNotes.as_view(),
        name="create_planningareanote",
    ),
    path(
        "planning_area/<int:planningarea_pk>/note",
        PlanningAreaNotes.as_view(),
        name="get_planningareanote",
    ),
    path(
        "planning_area/<int:planningarea_pk>/note/<int:planningareanote_pk>",
        PlanningAreaNotes.as_view(),
        name="get_planningareanote",
    ),
    path(
        "planning_area/<int:planningarea_pk>/note/<int:planningareanote_pk>",
        PlanningAreaNotes.as_view(),
        name="delete_planningareanote",
    ),
    # UserPrefs
    path(
        "user_prefs/<str:preference_key>/",
        UserPreferencesView.as_view(),
        name="delete_userprefs",
    ),
    path("user_prefs/", UserPreferencesView.as_view(), name="get_userprefs"),
    path("user_prefs/", UserPreferencesView.as_view(), name="patch_userprefs"),
]
