from django.urls import path
from . import views

app_name = 'forsys'

urlpatterns = [
    path('scenario_set/', views.scenario_set, name='scenario_set'),
]
