from dj_rest_auth.registration.views import VerifyEmailView
from django.conf import settings
from django.contrib import admin
from django.urls import include, path, register_converter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from users import views as user_views

from planscape.url_converters import ContentTypeURLConverter

register_converter(ContentTypeURLConverter, "ctype")

urlpatterns = [
    path(f"planscape-backend/{settings.ADMIN_URL_PREFIX}/", admin.site.urls),
    path("planscape-backend/planning/", include("planning.urls")),
    path(
        "planscape-backend/invites/",
        include("collaboration.urls"),
    ),
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
    path("planscape-backend/v2/", include("planscape.urls_v2")),
    path("martor/", include("martor.urls")),
]

if settings.ENV == "development":
    urlpatterns.append(
        path("planscape-backend/v2/schema", SpectacularAPIView.as_view(), name="schema")
    )
    urlpatterns.append(
        path(
            "planscape-backend/v2/schema/swagger",
            SpectacularSwaggerView.as_view(),
            name="swagger",
        ),
    )
