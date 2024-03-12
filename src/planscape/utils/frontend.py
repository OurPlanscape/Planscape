import logging
import urllib.parse
from typing import Any, Dict
from django.conf import settings


class NotInTestingFilter(logging.Filter):
    def filter(self, record):
        from django.conf import settings

        return not settings.TESTING_MODE


def get_base_url(env):
    match env:
        case "production":
            return "https://app.planscape.org"
        case "staging":
            return "https://staging.planscape.org"
        case "demo":
            return "https://demo.planscape.org"
        case _:
            return "https://dev.planscape.org"


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