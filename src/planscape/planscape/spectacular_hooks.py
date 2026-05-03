"""drf-spectacular preprocessing hooks for the Planscape API schema.

Wired up via ``SPECTACULAR_SETTINGS["PREPROCESSING_HOOKS"]`` in settings.py.
"""

from typing import Iterable, List, Tuple

# Path fragments that should never make it into the generated Angular client.
# Each entry is matched as a substring against the endpoint's full path.
#
# Add a new entry only when:
#   1. No frontend code consumes the endpoint (verify with `grep -rn` against
#      `src/interface/src` excluding `src/generated`), AND
#   2. The endpoint is genuinely server-side / operator-only — leaving it in
#      the client would suggest it's callable when it isn't.
#
# If an endpoint MIGHT one day be called from the frontend, keep it in the
# schema; dead generated methods are cheaper than re-instating the schema for
# something we forgot we excluded.
EXCLUDED_PATH_FRAGMENTS: Tuple[str, ...] = (
    # Django admin viewsets — the operator UI under `/v2/admin/datalayers/`,
    # `/v2/admin/datasets/`, `/v2/admin/styles/`, `/v2/admin/workspaces/`.
    # ~25 operations.
    "/v2/admin/",
    # Liveness probe — used by Kubernetes / load balancers, not the frontend.
    "/health",
    # E2E test cleanup endpoint — a destructive utility used by the Playwright
    # suite to wipe a test user. Frontend has no business calling it.
    "/users/e2e/",
    # Server-to-server tile-auth endpoint called by Martin (the tile server)
    # via `X-Original-URI` header to gate access to private vector tiles.
    # Never invoked from a browser.
    "/users/validate_martin_request",
)


def exclude_internal_paths(
    endpoints: Iterable[Tuple[str, str, str, object]], **kwargs
) -> List[Tuple[str, str, str, object]]:
    """Strip operator/server-only endpoints from the OpenAPI schema.

    See ``EXCLUDED_PATH_FRAGMENTS`` for the list and rationale per entry.
    """
    return [
        endpoint
        for endpoint in endpoints
        if not any(fragment in endpoint[0] for fragment in EXCLUDED_PATH_FRAGMENTS)
    ]
