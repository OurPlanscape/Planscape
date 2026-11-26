import base64
import hashlib
import hmac
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import quote

from django.conf import settings

SECONDS_PER_DAY = 86400
# Extra validity past the end of a window, so a URL issued just before the
# boundary still works for a day.
EXPIRY_GRACE_SECONDS = SECONDS_PER_DAY


def is_raster_cdn_configured() -> bool:
    return bool(
        settings.RASTER_CDN_BASE_URL
        and settings.RASTER_CDN_KEY_NAME
        and settings.RASTER_CDN_SIGNING_KEY
    )


def get_window_expiry(now: Optional[datetime] = None) -> int:
    """
    Returns the expiry timestamp shared by every URL signed in the current
    window. Time is cut into fixed windows of RASTER_CDN_URL_WINDOW_DAYS, so
    two calls in the same window sign the same URL and browsers can cache it.
    """
    window = settings.RASTER_CDN_URL_WINDOW_DAYS * SECONDS_PER_DAY
    timestamp = int((now or datetime.now(timezone.utc)).timestamp())
    return (timestamp // window + 1) * window + EXPIRY_GRACE_SECONDS


def sign_url(url: str, key_name: str, key: str, expires_at: int) -> str:
    """
    Signs a URL for Cloud CDN.
    https://cloud.google.com/cdn/docs/using-signed-urls

    Args:
        url (str): The URL to sign.
        key_name (str): The name of the signed request key on the backend.
        key (str): The base64url encoded key, with or without padding.
        expires_at (int): Unix timestamp when the URL stops working.
    """
    separator = "&" if "?" in url else "?"
    url_to_sign = f"{url}{separator}Expires={expires_at}&KeyName={key_name}"
    decoded_key = base64.urlsafe_b64decode(key + "=" * (-len(key) % 4))
    digest = hmac.new(decoded_key, url_to_sign.encode("utf-8"), hashlib.sha1).digest()
    signature = base64.urlsafe_b64encode(digest).decode("utf-8")
    return f"{url_to_sign}&Signature={signature}"


def create_raster_cdn_url(gs_url: str) -> Optional[str]:
    """
    Creates a signed CDN URL for a datalayer stored in the datastore bucket.
    Returns None for anything the CDN does not serve.
    """
    bucket_prefix = f"gs://{settings.GCS_BUCKET}/"
    if not gs_url.startswith(bucket_prefix):
        return None

    object_name = gs_url[len(bucket_prefix) :]
    if not object_name.startswith(f"{settings.DATALAYERS_FOLDER}/"):
        return None

    base_url = settings.RASTER_CDN_BASE_URL.rstrip("/")
    return sign_url(
        f"{base_url}/{quote(object_name, safe='/')}",
        settings.RASTER_CDN_KEY_NAME,
        settings.RASTER_CDN_SIGNING_KEY,
        get_window_expiry(),
    )
