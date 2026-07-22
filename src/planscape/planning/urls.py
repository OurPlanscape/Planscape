from django.urls import path

from planning.views import (
    PlanningAreaNotes,
    download_csv,
    download_shapefile,
    list_planning_areas,
)

app_name = "planning"

urlpatterns = [
    # Plans / Planning Areas
    path(
        "list_planning_areas/",
        list_planning_areas,
        name="list_planning_areas",
    ),
    # Scenarios
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
]
