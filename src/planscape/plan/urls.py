from django.urls import path
from plan.views import (
    create_plan, create_project, delete, get_plan, get_project,
    get_project_areas, get_scores, list_plans_by_owner, delete_projects,
    create_project_area, update_project, list_projects_for_plan)

app_name = 'plan'

urlpatterns = [
    # Plans
    path('create/', create_plan, name='create'),
    path('delete/', delete, name='delete'),
    path('get_plan/', get_plan, name='get_plan'),
    path('list_plans_by_owner/', list_plans_by_owner, name='list_plans_by_owner'),
    path('scores/', get_scores, name='get_scores'),
    # Projects
    path('create_project/', create_project, name='create_project'),
    path('get_project/', get_project, name='get_project'),
    path('list_projects_for_plan/', list_projects_for_plan,
         name='list_projects_for_plan'),
    path('update_project/', update_project, name='update_project'),
    path('delete_projects/', delete_projects, name='delete_projects'),
    path('create_project_area/', create_project_area, name='create_project_area'),
    path('get_project_areas/', get_project_areas, name='get_project_areas'),
]
