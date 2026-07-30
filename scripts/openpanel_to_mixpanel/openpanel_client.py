"""OpenPanel export API client: window-chunked, paginated event export.

Two undocumented behaviors of the self-hosted export endpoint drive the
design here (confirmed against apps/api/src/controllers/export.controller.ts
in the OpenPanel source):

- Omitting `start`/`end` falls back to a ~12 hour default window, so callers
  must always pass both explicitly.
- `properties` (and most other fields) are omitted from the response unless
  requested via `includes=...` - the default column set is minimal.
"""
from __future__ import annotations

import json
import random
import time
from dataclasses import dataclass
from datetime import date, timedelta
from pathlib import Path
from typing import Iterator

import requests

EXPORT_PATH = "/export/events"
# Requested as 1000 (docs' stated max) but this deployment silently clamps
# every response to 50 rows/page regardless of what's requested - confirmed
# empirically, not a bug in this client. Left at 1000 in case that clamp is
# raised later; it costs nothing to ask for more than we'll get.
PAGE_LIMIT = 1000
MIN_REQUEST_INTERVAL = 0.25  # spacing between requests; retry below is the real safety net
MAX_RETRIES = 6
INITIAL_BACKOFF_SECONDS = 1.0
MAX_BACKOFF_SECONDS = 30.0

# Sent as repeated `includes=` query params, NOT comma-joined: this deployment
# silently falls back to the default (minimal) field set if `includes` is a
# single comma-separated value, with no error - confirmed empirically against
# op.sig-gis.com, and not documented anywhere. `requests` serializes a list
# value as repeated params, which is what this API actually expects.
INCLUDES = [
    "properties",
    "profile",
    "region",
    "longitude",
    "latitude",
    "osVersion",
    "browserVersion",
    "device",
    "brand",
    "model",
    "origin",
    "referrer",
    "referrerName",
    "referrerType",
    "sdkName",
    "sdkVersion",
    "revenue",
    "groups",
]


@dataclass
class OpenPanelConfig:
    base_url: str
    client_id: str
    client_secret: str
    project_id: str | None = None


class OpenPanelClient:
    def __init__(self, config: OpenPanelConfig):
        self.config = config
        self.session = requests.Session()
        self.session.headers.update(
            {
                "openpanel-client-id": config.client_id,
                "openpanel-client-secret": config.client_secret,
            }
        )
        self._last_request_at = 0.0

    def _throttle(self) -> None:
        elapsed = time.monotonic() - self._last_request_at
        if elapsed < MIN_REQUEST_INTERVAL:
            time.sleep(MIN_REQUEST_INTERVAL - elapsed)

    def _get_page(self, start: str, end: str, page: int) -> dict:
        params = {
            "start": start,
            "end": end,
            "page": page,
            "limit": PAGE_LIMIT,
            "includes": INCLUDES,
        }
        if self.config.project_id:
            params["projectId"] = self.config.project_id
        url = self.config.base_url.rstrip("/") + EXPORT_PATH

        delay = INITIAL_BACKOFF_SECONDS
        for attempt in range(1, MAX_RETRIES + 1):
            self._throttle()
            resp = self.session.get(url, params=params, timeout=60)
            self._last_request_at = time.monotonic()
            if resp.status_code == 429 and attempt < MAX_RETRIES:
                retry_after = resp.headers.get("Retry-After")
                sleep_for = (
                    float(retry_after) if retry_after else min(delay, MAX_BACKOFF_SECONDS)
                )
                sleep_for += random.uniform(0, 1.0)
                print(f"  429 from OpenPanel, retrying in {sleep_for:.1f}s (attempt {attempt}/{MAX_RETRIES})")
                time.sleep(sleep_for)
                delay *= 2
                continue
            resp.raise_for_status()
            return resp.json()
        resp.raise_for_status()
        return resp.json()

    def fetch_window(self, start: date, end: date) -> Iterator[dict]:
        """Yield every event in [start, end] (inclusive, day granularity).

        Deliberately ignores `meta.pages`/`meta.totalCount` for pagination
        termination: confirmed empirically that this deployment's count query
        is unreliable (a request that returned 50 events in `data` reported
        `totalCount: 0, pages: 0` in the same response - internally
        inconsistent). Trusting that field silently truncated every window to
        a fixed number of pages regardless of actual volume. Paging until a
        genuinely empty page comes back is slower (one extra confirmation
        request per window) but can't be fooled by a wrong counter.
        """
        start_s, end_s = start.isoformat(), end.isoformat()
        page = 1
        while True:
            payload = self._get_page(start_s, end_s, page)
            events = payload.get("data", [])
            if not events:
                break
            for event in events:
                yield event
            page += 1


def iter_windows(
    start: date, end: date, chunk_days: int
) -> Iterator[tuple[date, date]]:
    """Split [start, end] into consecutive, inclusive date windows.

    Chunking (rather than one huge range query) keeps each query's page
    count low - deep ClickHouse offsets degrade badly per OpenPanel's own
    event.service.ts.
    """
    cursor = start
    step = timedelta(days=chunk_days)
    one_day = timedelta(days=1)
    while cursor <= end:
        window_end = min(cursor + step - one_day, end)
        yield cursor, window_end
        cursor = window_end + one_day


def export_range(
    client: OpenPanelClient,
    start: date,
    end: date,
    chunk_days: int,
    raw_dir: Path,
    force: bool = False,
) -> None:
    """Fetch every event in [start, end], writing one NDJSON file per window.

    Re-runnable: windows whose output file already exists are skipped unless
    force=True, so an interrupted export can just be re-invoked.
    """
    raw_dir.mkdir(parents=True, exist_ok=True)
    for window_start, window_end in iter_windows(start, end, chunk_days):
        out_path = raw_dir / f"{window_start.isoformat()}_{window_end.isoformat()}.ndjson"
        if out_path.exists() and not force:
            print(f"skip {out_path.name} (exists)")
            continue
        count = 0
        tmp_path = out_path.with_suffix(".ndjson.tmp")
        with tmp_path.open("w") as f:
            for event in client.fetch_window(window_start, window_end):
                f.write(json.dumps(event) + "\n")
                count += 1
        tmp_path.rename(out_path)
        print(f"{out_path.name}: {count} events")
