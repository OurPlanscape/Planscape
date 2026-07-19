from django.urls import path
from . import views

app_name = "users"

urlpatterns = [
    path("get_user_by_id/", views.get_user_by_id, name="get_user_by_id"),
    path("deactivate/", views.deactivate_user, name="deactivate"),
    path("e2e/destroy/", views.destroy_user, name="e2e-destroy"),
    path(
        "validate_martin_request",
        views.validate_martin_request,
        name="validate-martin-request",
    ),
]
