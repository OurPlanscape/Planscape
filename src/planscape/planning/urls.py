from django.conf.urls import include
from django.urls import path

from planning.views import (
    PlanningAreaNotes,
    create_shared_link,
    download_csv,
    download_shapefile,
    get_shared_link,
    update_scenario_result,
    validate_planning_area,
)
from planning.views_userprefs import UserPreferencesView

app_name = "planning"

urlpatterns = [
    # Auto-generated API documentation
    path("admin/doc/", include("django.contrib.admindocs.urls")),
    # Plans / Planning Areas
    path(
        "validate_planning_area/",
        validate_planning_area,
        name="validate_planning_area",
    ),
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
        "update_scenario_result/",
        update_scenario_result,
        name="update_scenario_result",
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
        "planning_area/<int:planningarea_pk>/note/",
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
