from __future__ import annotations

from typing import Any

from django.core.cache import cache
from django.utils import timezone

BACKUP_LOCK_KEY = "admin:generate_backup_data:lock"
BACKUP_STATUS_KEY = "admin:generate_backup_data:status"
BACKUP_LOCK_TIMEOUT = 60 * 60 * 6

BACKUP_STATE_IDLE = "idle"
BACKUP_STATE_QUEUED = "queued"
BACKUP_STATE_RUNNING = "running"
BACKUP_STATE_SUCCESS = "success"
BACKUP_STATE_FAILED = "failed"
BACKUP_ACTIVE_STATES = {BACKUP_STATE_QUEUED, BACKUP_STATE_RUNNING}


def acquire_backup_lock() -> bool:
    return cache.add(BACKUP_LOCK_KEY, True, timeout=BACKUP_LOCK_TIMEOUT)


def release_backup_lock() -> None:
    cache.delete(BACKUP_LOCK_KEY)


def is_backup_locked() -> bool:
    return bool(cache.get(BACKUP_LOCK_KEY, False))


def is_backup_active() -> bool:
    return (
        get_backup_status().get("state") in BACKUP_ACTIVE_STATES or is_backup_locked()
    )


def set_backup_status(state: str, **extra: Any) -> dict[str, Any]:
    status = {
        "state": state,
        "updated_at": timezone.now().isoformat(),
        **extra,
    }
    cache.set(BACKUP_STATUS_KEY, status, timeout=BACKUP_LOCK_TIMEOUT)
    return status


def get_backup_status() -> dict[str, Any]:
    status = cache.get(BACKUP_STATUS_KEY)
    if status:
        return status
    return {
        "state": BACKUP_STATE_IDLE,
        "updated_at": None,
    }
