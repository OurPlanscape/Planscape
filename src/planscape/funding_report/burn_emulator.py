"""Authenticated client for the burn-emulator jobs API."""

from urllib.parse import quote, urlsplit

import requests
from django.conf import settings
from google.auth.exceptions import GoogleAuthError, TransportError
from google.auth.transport.requests import Request
from google.oauth2.id_token import fetch_id_token


class BurnEmulatorError(Exception):
    """A terminal API, authentication, or response validation failure."""


class BurnEmulatorTransientError(BurnEmulatorError):
    """A request that can safely be retried (POST is deduplicated by geometry)."""


def request_job(method: str, job_id: str | None = None, *, geometry=None) -> dict:
    base_url = settings.BURN_EMULATOR_API_URL.rstrip("/")
    parsed = urlsplit(base_url)
    if parsed.scheme not in ("https", "http") or not parsed.netloc:
        raise BurnEmulatorError("BURN_EMULATOR_API_URL must be an absolute HTTP URL.")
    audience = f"{parsed.scheme}://{parsed.netloc}"
    try:
        token = fetch_id_token(Request(), audience)
    except TransportError as exc:
        raise BurnEmulatorTransientError(
            "Unable to reach Google token service."
        ) from exc
    except (GoogleAuthError, ValueError) as exc:
        raise BurnEmulatorError(
            "Unable to obtain burn-emulator IAM credentials."
        ) from exc

    url = f"{base_url}/v1/jobs"
    if job_id is not None:
        url += "/" + quote(job_id, safe="/")
    try:
        response = requests.request(
            method,
            url,
            headers={"Authorization": f"Bearer {token}"},
            **({"json": {"treatment_area": geometry}} if method == "POST" else {}),
            timeout=300 if method == "POST" else 30,
        )
    except requests.RequestException as exc:
        raise BurnEmulatorTransientError("Burn-emulator request failed.") from exc
    message = f"Burn-emulator HTTP {response.status_code}: {response.text[:1000]}"
    if response.status_code == 429 or response.status_code >= 500:
        raise BurnEmulatorTransientError(message)
    if response.status_code not in ((200, 202) if method == "POST" else (200,)):
        raise BurnEmulatorError(message)
    try:
        data = response.json()
    except ValueError as exc:
        raise BurnEmulatorError("Burn-emulator returned invalid JSON.") from exc
    if (
        not isinstance(data, dict)
        or data.get("status") not in ("pending", "cached", "failed")
        or not isinstance(data.get("job_id"), str)
        or not data["job_id"]
        or (job_id is not None and data["job_id"] != job_id)
        or (data["status"] == "cached" and not isinstance(data.get("output_path"), str))
        or (data["status"] == "cached" and not data.get("output_path"))
    ):
        raise BurnEmulatorError("Burn-emulator returned an invalid job response.")
    return data
