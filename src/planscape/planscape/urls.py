"""planscape URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from dj_rest_auth.registration.views import VerifyEmailView
from users import views as user_views
from users.views import CustomUserDetailsView

urlpatterns = [
    path("planscape-backend/admin/", admin.site.urls),
    path("planscape-backend/boundary/", include("boundary.urls")),
    path("planscape-backend/conditions/", include("conditions.urls")),
    path("planscape-backend/forsys/", include("forsys.urls")),
    path("planscape-backend/plan/", include("plan.urls")),
    path("planscape-backend/planning/", include("planning.urls")),
    path("planscape-backend/projects/", include("existing_projects.urls")),
    # Auth URLs
    path("planscape-backend/users/", include("users.urls")),
    path(
        "planscape-backend/dj-rest-auth/password/reset/<slug:user_id>/<slug:token>",
        user_views.verify_password_reset_token,
        name="verify_password_reset_token",
    ),
    path("planscape-backend/dj-rest-auth/", include("dj_rest_auth.urls")),
    path(
        "planscape-backend/dj-rest-auth/registration/",
        include("dj_rest_auth.registration.urls"),
    ),
    path(
        "planscape-backend/dj-rest-auth/registration/account-confirm-email/",
        VerifyEmailView.as_view(),
    ),
    path(
        "planscape-backend/dj-rest-auth/user/",
        CustomUserDetailsView.as_view(),
        name="user-details",
    ),
]
