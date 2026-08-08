import logging
from typing import Any, Dict

from django.conf import settings
from django.core.management import call_command
from mixpanel import Mixpanel, MixpanelException

from core.backup_state import (
    BACKUP_STATE_FAILED,
    BACKUP_STATE_RUNNING,
    BACKUP_STATE_SUCCESS,
    acquire_backup_lock,
    acquire_restore_lock,
    release_backup_lock,
    release_restore_lock,
    set_backup_status,
    set_restore_status,
)
from planscape.celery import app

log = logging.getLogger(__name__)


@app.task()
def track_mixpanel(payload: Dict[str, Any]) -> None:
    if not settings.MIXPANEL_INTEGRATION:
        return

    mp = Mixpanel(settings.MIXPANEL_PROJECT_TOKEN)
    kind = payload["type"]
    data = payload["payload"]
    try:
        if kind == "track":
            mp.track(
                data["distinct_id"], data["event_name"], data.get("properties") or {}
            )
        elif kind == "identify":
            mp.people_set(data["distinct_id"], data.get("properties") or {})
    except MixpanelException:
        log.exception("Something went wrong while posting data to Mixpanel")
        return

    log.info("Event tracked in Mixpanel")


@app.task()
def generate_backup_data_task() -> None:
    if not acquire_backup_lock():
        raise RuntimeError("A backup is already running.")

    set_backup_status(BACKUP_STATE_RUNNING)
    try:
        call_command("generate_backup_data")
    except Exception as exc:
        set_backup_status(BACKUP_STATE_FAILED, error=str(exc))
        raise
    else:
        set_backup_status(BACKUP_STATE_SUCCESS)
    finally:
        release_backup_lock()


@app.task()
def load_latest_catalog_backup_task() -> None:
    if not acquire_restore_lock():
        raise RuntimeError("A restore is already running.")

    set_restore_status(BACKUP_STATE_RUNNING)
    try:
        call_command("load_backup_data", force=True)
    except Exception as exc:
        set_restore_status(BACKUP_STATE_FAILED, error=str(exc))
        raise
    else:
        set_restore_status(BACKUP_STATE_SUCCESS)
    finally:
        release_restore_lock()
