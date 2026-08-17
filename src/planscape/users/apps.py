import logging

from django.apps import AppConfig
from django.contrib.auth import get_user_model
from django.contrib.auth.signals import user_logged_in, user_login_failed
from django.db import transaction
from django.db.models.signals import post_save

log = logging.getLogger(__name__)


def log_login_failure(sender, credentials, request, **kwargs):
    from planscape.analytics import track_event

    login_user_identifier = (
        credentials.get("email")
        or credentials.get("username")
        or "no identifier provided"
    )
    track_event(
        "users.login_failed", properties={"email": credentials.get("email") or ""}
    )
    log.warning(
        "Failed to login: %s via %s",
        login_user_identifier,
        request,
    )


def handle_email_confirmed(sender, request, email_address, **kwargs):
    from planscape.analytics import track_event

    track_event(
        "users.email_confirmed",
        properties={"email": email_address.email},
        user_id=email_address.user_id,
    )


def handle_user_logged_in(sender, request, user, **kwargs):
    from planscape.analytics import identify_user, track_event

    identify_user(user)
    track_event(
        "users.logged_in",
        properties={
            "email": user.email if user else None,
        },
        user_id=user.pk,
    )


def create_user_profile(sender, instance, created, **kwargs):
    from django.db import OperationalError, ProgrammingError

    from users.models import UserProfile

    if not created:
        return

    try:
        UserProfile.objects.get_or_create(user=instance)
    except (OperationalError, ProgrammingError):
        # DO NOT REMOVE THIS TRY/EXCEPT
        # since our migration dependency chain is complicated, some migrations
        # might touch users BEFORE the migration is complete
        # (older migrations that create users for example)
        pass


def handle_user_signed_up(sender, request, user, **kwargs):
    from users.tasks import send_welcome_email

    transaction.on_commit(lambda: send_welcome_email.delay(user.pk))


class UsersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "users"

    actstream_models = tuple()

    def register_actstream(self):
        from actstream import registry

        User = get_user_model()
        registry.register(User)
        for model in self.actstream_models:
            registry.register(model)

    def ready(self):
        from allauth.account.signals import email_confirmed, user_signed_up

        self.register_actstream()
        user_login_failed.connect(
            log_login_failure, dispatch_uid="users.log_login_failure"
        )
        user_logged_in.connect(
            handle_user_logged_in, dispatch_uid="users.handle_user_logged_in"
        )
        post_save.connect(
            create_user_profile,
            sender=get_user_model(),
            dispatch_uid="users.create_user_profile",
        )
        email_confirmed.connect(
            handle_email_confirmed, dispatch_uid="users.handle_email_confirmed"
        )
        user_signed_up.connect(
            handle_user_signed_up,
            dispatch_uid="users.handle_user_signed_up",
        )
