from django.urls import path

from plan.views import create_plan, create_project, get_plan, list_plans_by_owner, create_scenario_set

app_name = 'plan'

urlpatterns = [
    # Plans
    path('create/', create_plan, name='create'),
    path('get_plan/', get_plan, name='get_plan'),
    path('list_plans_by_owner/', list_plans_by_owner, name='list_plans_by_owner'),
    # Projects
    path('create_project/', create_project, name='create_project'),
    # Scenarios
    path('create_scenario_set/', create_scenario_set, name='create_scenario_set')
]
