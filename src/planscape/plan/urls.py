from django.urls import path

from plan.views import create
from plan.views import get_plan
from plan.views import list_plans_by_owner

app_name = 'plan'

urlpatterns = [
    path('create/', create, name='create'),
    path('get_plan/', get_plan, name='get_plan'),
    path('list_plans_by_owner', list_plans_by_owner, name='list_plans_by_owner')
]
