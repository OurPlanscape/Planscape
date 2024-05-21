from django.urls import path
from . import views

app_name = "conditions"

urlpatterns = [
    path("config/", views.config, name="legacy_conditions"),
    path("metrics/", views.metrics, name="legacy_metrics"),
]
