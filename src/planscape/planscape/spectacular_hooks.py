"""drf-spectacular preprocessing hooks for the Planscape API schema.

Wired up via ``SPECTACULAR_SETTINGS["PREPROCESSING_HOOKS"]`` in settings.py.
"""

from typing import Iterable, List, Tuple


def exclude_admin_paths(
    endpoints: Iterable[Tuple[str, str, str, object]], **kwargs
) -> List[Tuple[str, str, str, object]]:
    """Strip admin-only endpoints from the OpenAPI schema.

    The Django admin views under ``/v2/admin/`` are operator tooling — they
    have no business in the public Angular client. Excluding them at schema
    time keeps `orval` from generating ~25 admin operations into
    `v2/v2.service.ts` that no frontend code calls.
    """
    return [
        endpoint for endpoint in endpoints if "/v2/admin/" not in endpoint[0]
    ]
