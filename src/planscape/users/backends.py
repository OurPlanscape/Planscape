from datetime import timedelta

from allauth.account.auth_backends import AuthenticationBackend
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
        thirty_days_after_signup = user.date_joined + timedelta(days=30)
        if now >= thirty_days_after_signup and (
            user.last_login is None or user.last_login < thirty_days_after_signup
        ):
            track_openpanel(
                "users.returned_after_30d",
                properties={"email": user.email},
                user_id=user.pk,
            )
