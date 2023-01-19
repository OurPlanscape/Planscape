from django.urls import path
from . import views

urlpatterns = [
    path('calmapper/', views.CalMAPPER.as_view()),
    path('its/', views.MillionAcres_ITS.as_view())
]
