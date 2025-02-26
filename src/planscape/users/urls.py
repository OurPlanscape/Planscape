from django.urls import path
from . import views

app_name = "users"

urlpatterns = [
    path("delete/", views.delete_user, name="delete"),
    path("get_user_by_id/", views.get_user_by_id, name="get_user_by_id"),
    path("is_verified/", views.is_verified_user, name="is_verified_user"),
    path("deactivate/", views.deactivate_user, name="deactivate"),
    path(
        "validate_martin_request",
        views.validate_martin_request,
        name="validate-martin-request",
    ),
]
