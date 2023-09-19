from django.urls import path
from . import views

app_name = "boundary"

urlpatterns = [
    path("config/", views.config),
]
