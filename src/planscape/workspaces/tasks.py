import logging
import smtplib

from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from planscape.celery import app
from utils.frontend import get_frontend_url

from workspaces.models import UserAccessWorkspace

logger = logging.getLogger(__name__)


@app.task(
    bind=True,
    autoretry_for=(Exception, smtplib.SMTPDataError),
    retry_backoff=True,
    retry_jitter=True,
    retry_kwargs={"max_retries": 3},
)
def send_workspace_invitation(
    self,
    user_access_workspace_id: int,
    message: str,
) -> None:
    try:
        access = UserAccessWorkspace.objects.select_related(
            "workspace", "invited_by"
        ).get(pk=user_access_workspace_id)
        workspace = access.workspace
        role = access.role.lower()
        role_article = "a"
        if role == "owner":
            role_article = "an"

        context = {
            "inviter": access.invited_by,
            "role_article": role_article,
            "role": role,
            "workspace": workspace,
            "message": message,
            "frontend_url": get_frontend_url("home"),
            "frontend_assets": get_frontend_url("assets"),
            "workspace_link": get_frontend_url(f"workspaces/{workspace.pk}"),
            "create_account_link": get_frontend_url(
                "signup",
                query_params={"redirect": f"workspaces/{workspace.pk}"},
            ),
        }

        inviter_name = (
            access.invited_by.get_full_name() if access.invited_by else "Someone"
        )
        subject = f"[Planscape] {inviter_name} invited you to be {role_article} {role} on '{workspace.name}'"

        txt = render_to_string("invites/new_workspace_invite_message.txt", context)
        html = render_to_string("invites/new_workspace_invite_message.html", context)
        send_mail(
            subject=subject,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[access.email],
            message=txt,
            html_message=html,
        )
        logger.info("Email sent inviting user to workspace %s", workspace.pk)
    except UserAccessWorkspace.DoesNotExist:
        logger.exception(
            "Can't find UserAccessWorkspace with id %s", user_access_workspace_id
        )
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
