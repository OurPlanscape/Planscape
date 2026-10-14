"""
Authenticates WebSocket handshakes the same way the REST API does: with the
dj-rest-auth JWT, taken from the `Authorization: Bearer` header or from the
JWT cookie the browser sends along on a same-site handshake.
"""

import logging
from http.cookies import CookieError, SimpleCookie
from typing import Optional

from channels.db import database_sync_to_async
from dj_rest_auth.app_settings import api_settings as rest_auth_settings
from django.contrib.auth.models import AnonymousUser
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

log = logging.getLogger(__name__)


def get_raw_token(scope: dict) -> Optional[str]:
    headers = dict(scope.get("headers") or [])

    authorization = headers.get(b"authorization", b"").decode("latin-1")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() == "bearer" and token.strip():
        return token.strip()

    raw_cookie = headers.get(b"cookie", b"").decode("latin-1")
    if not raw_cookie:
        return None
    cookie: SimpleCookie = SimpleCookie()
    try:
        cookie.load(raw_cookie)
    except CookieError:
        return None
    morsel = cookie.get(rest_auth_settings.JWT_AUTH_COOKIE)
    if morsel is None or not morsel.value:
        return None
    return morsel.value


@database_sync_to_async
def get_user(raw_token: str):
    authentication = JWTAuthentication()
    try:
        validated_token = authentication.get_validated_token(raw_token)
        return authentication.get_user(validated_token)
    except (InvalidToken, TokenError, AuthenticationFailed):
        return AnonymousUser()


class JWTAuthMiddleware:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        raw_token = get_raw_token(scope)
        scope["user"] = await get_user(raw_token) if raw_token else AnonymousUser()
        return await self.inner(scope, receive, send)
