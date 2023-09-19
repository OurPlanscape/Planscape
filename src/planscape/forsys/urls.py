from django.urls import path
from . import views

app_name = "forsys"

urlpatterns = [
    path(
        "rank_project_areas/multiple_scenarios/",
        views.rank_project_areas_for_multiple_scenarios,
        name="rank_project_areas_for_multiple_scenarios",
    ),
    path(
        "rank_project_areas/single_scenario/",
        views.rank_project_areas_for_a_single_scenario,
        name="rank_project_areas_for_a_single_scenario",
    ),
    path(
        "generate_project_areas/single_scenario/",
        views.generate_project_areas_for_a_single_scenario,
        name="generate_project_areas_for_a_single_scenario",
    ),
    path(
        "generate_project_areas_from_lambda_output_prototype/",
        views.generate_project_areas_from_lambda_output_prototype,
        name="generate_project_areas_from_lambda_output_prototype",
    ),
]
