from django.urls import path
from planscape.forsys import views

app_name = 'forsys'

urlpatterns = [
    path('scenario_set/', views.scenario_set),
]
