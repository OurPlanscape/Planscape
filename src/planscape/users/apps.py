import logging
from django.apps import AppConfig
from django.contrib.auth import user_login_failed, get_user_model

log = logging.getLogger(__name__)


def log_login_failure(sender, credentials, request, **kwargs):
    email = credentials["email"]
    log.warning(
        "Failed to login: %s via %s",
        email,
        request,
    )


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
