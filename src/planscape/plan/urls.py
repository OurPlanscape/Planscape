from django.urls import path
from plan.views import (create, create_project, delete, get_plan, get_scores,
                        list_plans_by_owner)

app_name = 'plan'

urlpatterns = [
    # Plans
    path('create/', create, name='create'),
    path('delete/', delete, name='delete'),
    path('get_plan/', get_plan, name='get_plan'),
    path('list_plans_by_owner/', list_plans_by_owner, name='list_plans_by_owner'),
    path('scores/', get_scores, name='get_scores'),
    # Projects
    path('create_project/', create_project, name='create_project')
]
