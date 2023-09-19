from django.urls import path
from . import views

app_name = "existing_projects"

urlpatterns = [
    path("calmapper/", views.CalMAPPER.as_view()),
    path("its/", views.MillionAcres_ITS.as_view(), name="its"),
]
