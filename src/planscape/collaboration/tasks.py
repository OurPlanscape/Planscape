import logging
import smtplib

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from planscape.celery import app
from utils.frontend import get_frontend_url

from collaboration.models import UserObjectRole

logger = logging.getLogger(__name__)


@app.task(
    bind=True,
    autoretry_for=(Exception, smtplib.SMTPDataError),
    retry_backoff=True,
    retry_jitter=True,
    retry_kwargs={"max_retries": 3},
)
def send_invitation(
    self,
    user_object_role_id: int,
    collaborator_exists: bool,
    message: str,
) -> None:
    try:
        user_object_role = UserObjectRole.objects.get(pk=user_object_role_id)
        planning_area = user_object_role.content_object
        role = user_object_role.role.lower()
        ## TODO: changing this just for this email template
        if role == "collaborator":
            role = "editor"
        role_article = "a"
        if role == "owner" or role == "editor":
            role_article = "an"

        context = {
            "inviter": user_object_role.inviter,
            "collaborator": (
                user_object_role.collaborator if collaborator_exists else None
            ),
            "role_article": role_article,
            "role": role,
            "planning_area": planning_area,
            "message": message,
            "frontend_url": get_frontend_url("home"),
            "frontend_assets": get_frontend_url("assets"),
            "planning_area_link": get_frontend_url(f"plan/{planning_area.pk}"),
            "create_account_link": get_frontend_url(
                "signup",
                query_params={"redirect": f"plan/{planning_area.pk}"},
            ),
        }

        subject = f"[Planscape] {user_object_role.inviter.get_full_name()} invited you to be {role_article} {role} on '{planning_area.name}'"

        txt = render_to_string("invites/new_invite_message.txt", context)
        html = render_to_string("invites/new_invite_message.html", context)
        send_mail(
            subject=subject,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user_object_role.email],
            message=txt,
            html_message=html,
        )
        logger.info("Email sent inviting user to planning area %s", planning_area.pk)
    except UserObjectRole.DoesNotExist:
        logger.exception("Can't find UserObjectRole with id %s", user_object_role_id)
    except smtplib.SMTPDataError:
        if self.request.retries >= self.max_retries:
            logger.exception("Failed to send email. SMTP server side error.")
        else:
            logger.warning("Failed to send email. SMTP server side error. Retrying.")
        raise
    except Exception:
        if self.request.retries >= self.max_retries:
            logger.exception("Something unexpected happened. Take a look!")
        else:
            logger.warning("Something unexpected happened. Retrying.")
        raise
