from __future__ import annotations

from typing import Any

from django.core.cache import cache
from django.utils import timezone

BACKUP_LOCK_KEY = "admin:generate_backup_data:lock"
BACKUP_STATUS_KEY = "admin:generate_backup_data:status"
RESTORE_LOCK_KEY = "admin:load_backup_data:lock"
RESTORE_STATUS_KEY = "admin:load_backup_data:status"
BACKUP_LOCK_TIMEOUT = 60 * 60 * 6

BACKUP_STATE_IDLE = "idle"
BACKUP_STATE_QUEUED = "queued"
BACKUP_STATE_RUNNING = "running"
BACKUP_STATE_SUCCESS = "success"
BACKUP_STATE_FAILED = "failed"
BACKUP_ACTIVE_STATES = {BACKUP_STATE_QUEUED, BACKUP_STATE_RUNNING}


def acquire_lock(lock_key: str) -> bool:
    return cache.add(lock_key, True, timeout=BACKUP_LOCK_TIMEOUT)


def release_lock(lock_key: str) -> None:
    cache.delete(lock_key)


def is_locked(lock_key: str) -> bool:
    return bool(cache.get(lock_key, False))


def set_status(status_key: str, state: str, **extra: Any) -> dict[str, Any]:
    status = {
        "state": state,
        "updated_at": timezone.now().isoformat(),
        **extra,
    }
    cache.set(status_key, status, timeout=BACKUP_LOCK_TIMEOUT)
    return status


def get_status(status_key: str) -> dict[str, Any]:
    status = cache.get(status_key)
    if status:
        return status
    return {
        "state": BACKUP_STATE_IDLE,
        "updated_at": None,
    }


def is_active(status_key: str, lock_key: str) -> bool:
    return get_status(status_key).get("state") in BACKUP_ACTIVE_STATES or is_locked(
        lock_key
    )


def acquire_backup_lock() -> bool:
    return acquire_lock(BACKUP_LOCK_KEY)


def release_backup_lock() -> None:
    release_lock(BACKUP_LOCK_KEY)


def is_backup_locked() -> bool:
    return is_locked(BACKUP_LOCK_KEY)


def is_backup_active() -> bool:
    return is_active(BACKUP_STATUS_KEY, BACKUP_LOCK_KEY)


def set_backup_status(state: str, **extra: Any) -> dict[str, Any]:
    return set_status(BACKUP_STATUS_KEY, state, **extra)


def get_backup_status() -> dict[str, Any]:
    return get_status(BACKUP_STATUS_KEY)


def acquire_restore_lock() -> bool:
    return acquire_lock(RESTORE_LOCK_KEY)


def release_restore_lock() -> None:
    release_lock(RESTORE_LOCK_KEY)


def is_restore_locked() -> bool:
    return is_locked(RESTORE_LOCK_KEY)


def is_restore_active() -> bool:
    return is_active(RESTORE_STATUS_KEY, RESTORE_LOCK_KEY)


def set_restore_status(state: str, **extra: Any) -> dict[str, Any]:
    return set_status(RESTORE_STATUS_KEY, state, **extra)


def get_restore_status() -> dict[str, Any]:
    return get_status(RESTORE_STATUS_KEY)
