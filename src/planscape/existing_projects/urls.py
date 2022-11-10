from django.urls import path
from . import views

urlpatterns = [
    path('', views.CalMAPPER.as_view())
]
