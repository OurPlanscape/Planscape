import logging
from django.apps import AppConfig
from django.contrib.auth import user_login_failed
from allauth.account.signals import user_logged_in, password_changed, password_reset

log = logging.getLogger(__name__)

def log_details(sender, user, request, **kwargs):
    log.info(f"\n\n***Logged in!** {user}\n\n")

def log_login_failure(sender, credentials, request, **kwargs):
    email = credentials['email']
    log.error(f"Failed to login: {email}")

def log_misc(sender, **kwargs):
    print(f"\n***Got a signal*** {sender}")

class PlanningConfig(AppConfig):
    name = "planning"

    def ready(self):
        user_logged_in.connect(log_details)
        user_login_failed.connect(log_login_failure)
        password_changed.connect(log_login_failure)
        password_reset.connect(log_login_failure)