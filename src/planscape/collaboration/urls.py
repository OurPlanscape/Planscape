from django.conf.urls import include
from django.urls import path
from collaboration.views import (
    CreateInvite,
)

app_name = "collaboration"
urlpatterns = [
    path(
        "create_invite/",
        CreateInvite.as_view(),
        name="create_invite",
    ),
]
