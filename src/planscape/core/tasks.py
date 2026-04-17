import json
import logging
from typing import Any, Dict

import requests
from django.conf import settings
from django.core.management import call_command
from django.core.serializers.json import DjangoJSONEncoder

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
def track(payload: Dict[str, Any]) -> None:
    if not settings.OPENPANEL_INTEGRATION:
        return

    url = f"{settings.OPENPANEL_URL}/track"
    headers = {
        "openpanel-client-id": settings.OPENPANEL_CLIENT_ID,
        "openpanel-client-secret": settings.OPENPANEL_CLIENT_SECRET,
        "Content-Type": "application/json",
    }
    data = json.dumps(payload, cls=DjangoJSONEncoder)
    response = requests.post(url, data=data, headers=headers)
    if response.status_code not in (200, 202):
        log.error("Something went wrong while posting data to OpenPanel")
        return

    log.info("Event tracked")


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
        call_command("load_backup_data", source_env="catalog", force=True)
    except Exception as exc:
        set_restore_status(BACKUP_STATE_FAILED, error=str(exc))
        raise
    else:
        set_restore_status(BACKUP_STATE_SUCCESS)
    finally:
        release_restore_lock()
