import logging

from django.conf import settings
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from datasets.models import DataLayer, DataLayerStatus
from datasets.services import is_upload_raw_url
from datasets.tasks import process_uploaded_datalayer

log = logging.getLogger(__name__)

OBJECT_FINALIZE = "OBJECT_FINALIZE"


def verify_pubsub_token(request) -> bool:
    """Checks the OIDC token Pub/Sub signs push requests with."""
    if not settings.GCS_PUSH_AUDIENCE or not settings.GCS_PUSH_SERVICE_ACCOUNT:
        log.warning("GCS push webhook called but not configured")
        return False
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return False
    try:
        claims = id_token.verify_oauth2_token(
            header.removeprefix("Bearer "),
            google_requests.Request(),
            audience=settings.GCS_PUSH_AUDIENCE,
        )
    except ValueError:
        return False
    return bool(
        claims.get("email_verified")
        and claims.get("email") == settings.GCS_PUSH_SERVICE_ACCOUNT
    )


class GCSUploadWebhookView(APIView):
    """
    Receives GCS object-finalize notifications through a Pub/Sub push
    subscription and starts processing the matching upload. Always answers
    2xx once authenticated, so Pub/Sub doesn't redeliver objects we ignore.
    """

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        if not verify_pubsub_token(request):
            return Response(status=status.HTTP_401_UNAUTHORIZED)

        message = request.data.get("message") or {}
        attributes = message.get("attributes") or {}
        if attributes.get("eventType") != OBJECT_FINALIZE:
            return Response(status=status.HTTP_204_NO_CONTENT)

        gs_url = f"gs://{attributes.get('bucketId')}/{attributes.get('objectId')}"
        if not is_upload_raw_url(gs_url):
            return Response(status=status.HTTP_204_NO_CONTENT)

        datalayer = DataLayer.objects.filter(
            raw_url=gs_url,
            status=DataLayerStatus.PENDING,
        ).first()
        if datalayer is None:
            log.info("No pending upload for %s", gs_url)
            return Response(status=status.HTTP_204_NO_CONTENT)

        process_uploaded_datalayer.delay(datalayer.pk)
        return Response(status=status.HTTP_204_NO_CONTENT)
