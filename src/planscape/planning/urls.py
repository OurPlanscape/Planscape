from django.urls import path
from planning.views import (create_plan, delete_plan, get_plan_by_id, list_plans)

app_name = 'planning'

urlpatterns = [
    # Plans / Planning Areas
    path('create_plan/', create_plan, name='create_plan'),
    path('delete_plan/', delete_plan, name='delete_plan'),
    path('get_plan_by_id/', get_plan_by_id, name='get_plan_by_id'),
    path('list_plans/', list_plans, name='list_plans'),

    # Scenarios
    # TODO

    # Project Areas
    # TODO
]
