from django.urls import path
from planning.views import (create_plan, delete_plan, get_plan_by_id, list_plans,
                            create_scenario, delete_scenario, get_scenario_by_id,
                            list_scenarios_for_plan, update_scenario_result)

app_name = 'planning'

#TODO: Change these to more standardized id-driven APIs, e.g. scenarios/[id]

urlpatterns = [
    # Plans / Planning Areas
    path('create_plan/', create_plan, name='create_plan'),
    path('delete_plan/', delete_plan, name='delete_plan'),
    path('get_plan_by_id/', get_plan_by_id, name='get_plan_by_id'),
    path('list_plans/', list_plans, name='list_plans'),

    # Scenarios
    path('create_scenario/', create_scenario, name='create_scenario'),
    path('delete_scenario/', delete_scenario, name='delete_scenario'),
    path('get_scenario_by_id/', get_scenario_by_id, name='get_scenario_by_id'),
    path('list_scenarios_for_plan/', list_scenarios_for_plan, name='list_scenarios_for_plan'),
    path('update_scenario_result/', update_scenario_result, name='update_scenario_result'),

    # Project Areas
    # TODO
]
