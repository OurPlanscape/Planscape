from django.conf import settings
from rasterio.session import GSSession



def get_gcs_session() -> GSSession:
    """
    Returns a Google Cloud Storage session for use with rasterio.
    This session is configured with the Google Application Credentials
    from the Django settings.

    Returns:
        GSSession: A rasterio session for Google Cloud Storage.
    """
    return GSSession(google_application_credentials=settings.GOOGLE_APPLICATION_CREDENTIALS_FILE)
