import logging
from django.apps import AppConfig
from django.contrib.auth import user_login_failed

log = logging.getLogger(__name__)


def log_login_failure(sender, credentials, request, **kwargs):
    email = credentials["email"]
    log.error(
        "Failed to login: %s via %s",
        email,
        request,
    )


class PlanningConfig(AppConfig):
    name = "planning"

    def ready(self):
        user_login_failed.connect(log_login_failure)
