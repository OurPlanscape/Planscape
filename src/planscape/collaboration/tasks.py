from planscape.celery import app
import logging

logger = logging.getLogger(__name__)


@app.task()
def send_invitation(
    user_object_role_id: int,
    collaborator_exists: bool,
    message: str,
) -> None:
    # send email yay!
    logger.info("Sending email")
