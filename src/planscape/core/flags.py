from django.conf import settings


def feature_enabled(feature_flag: str) -> bool:
    """
    Determines if a particular feature flag is enabled.
    Returns true or false.
    """
    return feature_flag in settings.FEATURE_FLAGS
