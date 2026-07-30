"""Mixpanel Import/Engage API client: batched upload with retry+backoff.

Auth is via a Service Account (Basic auth), with the target project selected
by the `project_id` query param - this is what lets the same code target a
disposable test project or the real production project purely via config.
"""
from __future__ import annotations

import base64
import gzip
import json
import random
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Iterator

import requests

IMPORT_URL = "https://api.mixpanel.com/import"
ENGAGE_URL = "https://api.mixpanel.com/engage"

EVENT_BATCH_SIZE = 2000
PROFILE_BATCH_SIZE = 2000
MAX_RETRIES = 5
INITIAL_BACKOFF_SECONDS = 2.0
MAX_BACKOFF_SECONDS = 60.0


@dataclass
class MixpanelConfig:
    project_id: str
    service_account_username: str
    service_account_secret: str


def _auth_header(config: MixpanelConfig) -> dict:
    token = base64.b64encode(
        f"{config.service_account_username}:{config.service_account_secret}".encode()
    ).decode()
    return {"Authorization": f"Basic {token}"}


def _batched(items: Iterable[dict], size: int) -> Iterator[list[dict]]:
    batch: list[dict] = []
    for item in items:
        batch.append(item)
        if len(batch) >= size:
            yield batch
            batch = []
    if batch:
        yield batch


def _safe_json(resp: requests.Response) -> dict:
    try:
        return resp.json()
    except ValueError:
        return {"raw": resp.text}


def _post_with_retry(
    session: requests.Session, url: str, params: dict, headers: dict, body: bytes
) -> tuple[int, dict]:
    delay = INITIAL_BACKOFF_SECONDS
    resp = None
    for attempt in range(1, MAX_RETRIES + 1):
        resp = session.post(url, params=params, headers=headers, data=body, timeout=120)
        if resp.status_code == 429 and attempt < MAX_RETRIES:
            sleep_for = min(delay, MAX_BACKOFF_SECONDS) + random.uniform(0, 1.5)
            print(f"  429, retrying in {sleep_for:.1f}s (attempt {attempt}/{MAX_RETRIES})")
            time.sleep(sleep_for)
            delay *= 2
            continue
        break
    assert resp is not None
    return resp.status_code, _safe_json(resp)


def _write_failed(failed_dir: Path, name: str, batch: list[dict], response_body: dict) -> None:
    failed_dir.mkdir(parents=True, exist_ok=True)
    with (failed_dir / name).open("w") as f:
        json.dump({"response": response_body, "batch": batch}, f, indent=2)


class MixpanelClient:
    def __init__(self, config: MixpanelConfig):
        self.config = config
        self.session = requests.Session()

    def import_events(self, events: Iterable[dict], failed_dir: Path) -> dict[str, int]:
        headers = {
            **_auth_header(self.config),
            "Content-Type": "application/json",
            "Content-Encoding": "gzip",
        }
        params = {"strict": "1", "project_id": self.config.project_id}
        imported = failed = 0
        for i, batch in enumerate(_batched(events, EVENT_BATCH_SIZE)):
            body = gzip.compress(json.dumps(batch).encode())
            status, response = _post_with_retry(self.session, IMPORT_URL, params, headers, body)
            # Mixpanel's strict-mode 400 responses still carry a structured
            # num_records_imported/failed_records body, same as a 200 with
            # partial failures - it's a genuine "some rows rejected", not a
            # whole-batch failure. Confirmed empirically: a 400 with 2000
            # events imported 1873 and only 127 were in failed_records.
            # `failed_records` is omitted entirely (not just empty) on a
            # clean 200 - only `num_records_imported` is a reliable signal
            # that this is a real structured response, not a raw 5xx/
            # network-level error with no such body.
            n_imported = response.get("num_records_imported")
            if n_imported is None:
                failed += len(batch)
                _write_failed(failed_dir, f"events_batch_{i}.json", batch, response)
                print(f"  events batch {i}: FAILED status={status} {response}")
                continue
            failed_records = response.get("failed_records") or []
            imported += n_imported
            if failed_records:
                failed += len(failed_records)
                _write_failed(failed_dir, f"events_batch_{i}_partial.json", batch, response)
            print(f"  events batch {i}: imported={n_imported} failed={len(failed_records)}")
        return {"imported": imported, "failed": failed}

    def import_profiles(self, profiles: Iterable[dict], failed_dir: Path) -> dict[str, int]:
        headers = {**_auth_header(self.config), "Content-Type": "application/json"}
        params: dict[str, Any] = {"project_id": self.config.project_id, "verbose": "1"}
        imported = failed = 0
        # Unlike /import, /engage still requires a $token per record even with
        # Service Account auth - confirmed empirically that the numeric
        # project_id works here. Injected at upload time (not in convert.py)
        # so converted NDJSON stays reusable across the test/production targets.
        tagged_profiles = (
            {**profile, "$token": self.config.project_id} for profile in profiles
        )
        for i, batch in enumerate(_batched(tagged_profiles, PROFILE_BATCH_SIZE)):
            body = json.dumps(batch).encode()
            status, response = _post_with_retry(self.session, ENGAGE_URL, params, headers, body)
            ok = status < 300 and response.get("status") in (1, "1", None)
            if not ok:
                failed += len(batch)
                _write_failed(failed_dir, f"profiles_batch_{i}.json", batch, response)
                print(f"  profiles batch {i}: FAILED status={status} {response}")
                continue
            imported += len(batch)
            print(f"  profiles batch {i}: imported={len(batch)}")
        return {"imported": imported, "failed": failed}
