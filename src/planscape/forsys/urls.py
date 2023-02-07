from django.urls import path
from . import views

app_name = 'forsys'

urlpatterns = [
    path(
        'rank_project_areas/multiple_scenarios/',
        views.rank_project_areas_for_multiple_scenarios,
        name='rank_project_areas_for_multiple_scenarios')]
