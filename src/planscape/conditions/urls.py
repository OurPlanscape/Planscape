from django.urls import path
from . import views

app_name = 'conditions'
app_name = 'conditions'

urlpatterns = [
    path('wms/', views.wms, name='wms'),
    path('config/', views.config)
]
