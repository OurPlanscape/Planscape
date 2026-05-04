import logging

from allauth.account.auth_backends import AuthenticationBackend
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


def track_returning_user(user) -> None:
    from planscape.openpanel import track_openpanel

    logger.info(f"user {user} logging in - last login {user.last_login}")
    now = timezone.now()
    number_of_days = settings.RETURNING_USER_THRESHOLD_DAYS
    current_bucket = (now - user.date_joined).days // number_of_days
    if current_bucket < 1:
        return

    profile = user.profile
    if current_bucket > profile.last_returning_user_bucket:
        period_days = current_bucket * number_of_days
        track_openpanel(
            f"users.returned_after_{period_days}d",
            properties={"email": user.email, "count": current_bucket},
            user_id=user.pk,
        )
        profile.last_returning_user_bucket = current_bucket
        profile.last_returning_user_event_at = now
        profile.save(
            update_fields=[
                "last_returning_user_bucket",
                "last_returning_user_event_at",
            ]
        )


class PlanscapeAuthBackend(AuthenticationBackend):
    def authenticate(self, request, **credentials):
        user = super().authenticate(request, **credentials)
        if user:
            track_returning_user(user)
        return user
