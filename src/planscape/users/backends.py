from datetime import timedelta

from allauth.account.auth_backends import AuthenticationBackend
from django.conf import settings
from django.utils import timezone
from planscape.openpanel import identify_openpanel, track_openpanel


class PlanscapeAuthBackend(AuthenticationBackend):
    def authenticate(self, request, **credentials):
        user = super().authenticate(request, **credentials)
        if user:
            identify_openpanel(user)  # type: ignore
            track_openpanel(
                "users.logged_in",
                user_id=user.pk,
                properties={
                    "email": user.email if user else None,
                },
            )
            self._track_returning_user(user)
        return user

    def _track_returning_user(self, user) -> None:
        now = timezone.now()
        number_of_days = settings.RETURNING_USER_THRESHOLD_DAYS
        target_date = user.date_joined + timedelta(days=number_of_days)
        if now >= target_date and (
            user.last_login is None or user.last_login < target_date
        ):
            track_openpanel(
                f"users.returned_after_{number_of_days}d",
                properties={"email": user.email},
                user_id=user.pk,
            )
