from datetime import timedelta

from allauth.account.auth_backends import AuthenticationBackend
from django.conf import settings
from django.utils import timezone


def track_returning_user(user) -> None:
    from planscape.openpanel import track_openpanel

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


class PlanscapeAuthBackend(AuthenticationBackend):
    def authenticate(self, request, **credentials):
        user = super().authenticate(request, **credentials)
        if user:
            track_returning_user(user)
        return user
