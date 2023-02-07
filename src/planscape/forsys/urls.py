from django.urls import path
from . import views

app_name = 'forsys'

urlpatterns = [path('rank_projects/multiple_scenarios/',
                    views.rank_projects_for_multiple_scenarios, name='rank_projects_for_multiple_scenarios'), ]
