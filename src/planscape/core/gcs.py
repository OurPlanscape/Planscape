import logging

from typing import Optional, Collection, Dict, Any

from cacheops import cached
from django.conf import settings
from rasterio.session import GSSession
import requests

from google.cloud import storage

logger = logging.getLogger(__name__)


def get_gcs_session() -> GSSession:
    """
    Returns a Google Cloud Storage session for use with rasterio.
    This session is configured with the Google Application Credentials
    from the Django settings.

    Returns:
        GSSession: A rasterio session for Google Cloud Storage.
    """
    return GSSession(
        google_application_credentials=settings.GOOGLE_APPLICATION_CREDENTIALS_FILE
    )


def is_gcs_file(input_file: Optional[str]) -> bool:
    if not input_file:
        return False
    return input_file.lower().startswith("gs://")


def get_bucket_and_key(gs_url: str) -> Collection[str]:
    return gs_url.replace("gs://", "").split("/", 1)


def get_gcs_hash(gs_url: str) -> Optional[str]:
    """
    Retrieves the crc32c hash of a Google Cloud Storage file.

    Args:
        gs_url (str): The GCS URL of the file.

    Returns:
        Optional[str]: The crc32c hash of the file, or None if not found.
    """
    if not is_gcs_file(gs_url):
        return None

    storage_client = storage.Client()
    bucket = storage_client.bucket(settings.GCS_BUCKET)
    blob_name = gs_url.replace(f"gs://{settings.GCS_BUCKET}/", "")
    blob = bucket.get_blob(blob_name)
    if not blob:
        return None

    return blob.crc32c


def create_upload_url(
    object_name: str,
    expiration: int = int(settings.GCS_PUBLIC_URL_TTL),
) -> Optional[Dict[str, Any]]:
    """
    Creates an upload URL for a Google Cloud Storage file.

    Args:
        gs_url (str): The GCS URL of the file.

    Returns:
        str: The upload URL for the file.
    """

    storage_client = storage.Client()
    bucket = storage_client.bucket(settings.GCS_BUCKET)

    blob = bucket.blob(object_name)

    url = blob.generate_signed_url(
        version="v4",
        expiration=expiration,
        method="PUT",
        content_type="application/octet-stream",
    )

    return {"url": url}


@cached(timeout=settings.GCS_PUBLIC_URL_TTL)
def create_download_url(
    gs_url: str,
    expiration: int = int(settings.GCS_PUBLIC_URL_TTL),
) -> Optional[str]:
    """
    Creates a download URL for a Google Cloud Storage file.

    Args:
        gs_url (str): The GCS URL of the file.

    Returns:
        str: The download URL for the file.
    """
    if not is_gcs_file(gs_url):
        raise ValueError(f"Invalid GCS URL: {gs_url}")

    storage_client = storage.Client()
    bucket = storage_client.bucket(settings.GCS_BUCKET)

    blob_name = gs_url.replace(f"gs://{settings.GCS_BUCKET}/", "")
    blob = bucket.get_blob(blob_name)
    if not blob:
        logger.error(f"Blob not found: {blob_name} in bucket {settings.GCS_BUCKET}")
        return None

    url = blob.generate_signed_url(
        version="v4",
        expiration=expiration,
        method="GET",
    )

    return url


def upload_file_via_api(
    object_name: str,
    input_file: str,
    url: str,
    chunk_size: int = settings.GCS_UPLOAD_CHUNK_SIZE,
):
    logger.info(f"Uploading file {object_name}.")
    with open(input_file, "rb") as f:
        logger.info(f"Opened file {input_file} for upload.")
        while True:
            chunk = f.read(chunk_size)
            logger.info(f"Read chunk of size {len(chunk)} from file {input_file}.")
            if not chunk:
                break

            files = {"file": (object_name, f)}
            logger.info(f"Uploading {object_name} chunk of size {len(chunk)}.")
            response = requests.put(
                url,
                files=files,
            )
            logger.info(f"Response status code: {response.status_code}")
            response.raise_for_status()
            logger.info(f"Uploaded {object_name} chunk of size {len(chunk)}.")
        logger.info(f"Uploaded {object_name} done.")
