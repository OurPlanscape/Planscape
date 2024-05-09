from django.urls import path
from . import views

app_name = "conditions"

urlpatterns = [
    path("config/", views.config),
    path("metrics/", views.metrics),
]
