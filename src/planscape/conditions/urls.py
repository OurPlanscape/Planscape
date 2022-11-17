from django.urls import path
from . import views

urlpatterns = [
    path('wms/', views.wms)
]
