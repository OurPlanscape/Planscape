import logging
import urllib.parse
from typing import Any, Dict

from django.conf import settings


class NotInTestingFilter(logging.Filter):
    def filter(self, record):
        from django.conf import settings

        return not settings.TESTING_MODE


def get_base_url(env):
    output = ""
    match env, settings.PROVIDER:
        case "production", "gcp":
            return "https://app.planscape.org"
        case "production", _:
            return "https://app.planscape.org"
        case "staging", "gcp":
            return "https://gstaging.planscape.org"
        case "staging", _:
            return "https://staging.planscape.org"
        case "demo", "gcp":
            return "https://gdemo.planscape.org"
        case "demo", _:
            return "https://demo.planscape.org"
        case _, "gcp":
            return "https://gdev.planscape.org"
        case _, _:
            return "https://dev.planscape.org"


def get_domain(env: str) -> str:
    url = get_base_url(env)
    return url.replace("https://", "")


def get_frontend_url(url: str, query_params: Dict[str, Any] = None):
    if url.startswith("/"):
        raise ValueError("URLs should not start with /. This is done internally here.")
    env = settings.ENV
    match query_params:
        case dict():
            encoded_query = urllib.parse.urlencode(query_params)
            return f"{get_base_url(env)}/{url}?{encoded_query}"
        case _:
            return f"{get_base_url(env)}/{url}"
