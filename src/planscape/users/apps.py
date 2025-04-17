import logging

from django.apps import AppConfig
from django.contrib.auth import get_user_model
from django.contrib.auth.signals import user_logged_in, user_login_failed

log = logging.getLogger(__name__)


def log_login_failure(sender, credentials, request, **kwargs):
    login_user_identifier = (
        credentials.get("email")
        or credentials.get("username")
        or "no identifier provided"
    )
    log.warning(
        "Failed to login: %s via %s",
        login_user_identifier,
        request,
    )


def handle_user_logged_in(sender, request, user, **kwargs):
    from planscape.openpanel import identify_openpanel, track_openpanel

    identify_openpanel(user)
    track_openpanel("users.logged_in", properties=None, user_id=user.pk)


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
        self.register_actstream()
        user_login_failed.connect(log_login_failure)
        user_logged_in.connect(handle_user_logged_in)
