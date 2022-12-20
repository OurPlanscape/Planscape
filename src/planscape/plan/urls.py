from django.urls import path

from plan.views import create, get_plan

app_name = 'plan'

urlpatterns = [
    path('create/', create, name='create'),
    path('get_plan/', get_plan, name='get_plan')
]
