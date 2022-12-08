from django.urls import path

from plan.views import create

app_name = 'plan'

urlpatterns = [
    path('create/', create, name='create')
]
