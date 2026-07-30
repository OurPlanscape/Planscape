import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.template.loader import render_to_string
from planscape.celery import app

log = logging.getLogger(__name__)

User = get_user_model()


@app.task()
def send_welcome_email(user_id: int) -> None:
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        log.warning("User %s does not exist; cannot send welcome email.", user_id)
        return

    email = (user.email or "").strip()
    if not email:
        log.info("User %s has no email; skipping welcome email.", user_id)
        return

    context = {
        "user_first_name": user.first_name or "there",
    }

    subject = "[Planscape] Welcome to Planscape"
    txt = render_to_string("email/new_users/welcome.txt", context)
    html = render_to_string("email/new_users/welcome.html", context)

    send_mail(
        subject=subject,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        message=txt,
        html_message=html,
    )

    log.info("Sent welcome email to user %s.", user_id)
