"""OpenPanel -> Mixpanel event/profile field mapping.

Geo (`$city`/`$region`/`mp_country_code`) and device (`$os`/`$browser`) are
mapped explicitly from OpenPanel's already-resolved fields rather than left
for Mixpanel to derive at import time - Mixpanel's own GeoIP-at-import only
has today's IP-to-location tables, which is a poor match for backdated
historical events.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterator

SOURCE_LABEL = "openpanel-migration"

# Keys inside an OpenPanel event's `properties` blob that are handled
# specially elsewhere (e.g. flattened out) rather than passed through as-is.
_RESERVED_EVENT_PROPERTY_KEYS = {"__query"}

_PROFILE_FIELD_MAP = {
    "email": "$email",
    "firstName": "$first_name",
    "lastName": "$last_name",
    "createdAt": "openpanel_created_at",
    "lastSeenAt": "openpanel_last_seen_at",
    "isExternal": "openpanel_is_external",
}


def _to_millis(created_at: str) -> int:
    dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    return int(dt.astimezone(timezone.utc).timestamp() * 1000)


# Mixpanel's own reserved/placeholder distinct_id blocklist (confirmed via a
# real 400 response's failed_records[].message). Some OpenPanel events carry
# a literal deviceId of "None" (the string, not JSON null) - passes a plain
# truthiness check but Mixpanel rejects it case-insensitively.
_BAD_DISTINCT_IDS = {
    "-1",
    "0",
    "00000000-0000-0000-0000-000000000000",
    "<nil>",
    "[]",
    "anon",
    "anonymous",
    "false",
    "lmy47d",
    "n/a",
    "na",
    "nil",
    "none",
    "null",
    "true",
    "undefined",
    "unknown",
    "{}",
}


def _is_valid_id(value: Any) -> bool:
    if not value:
        return False
    return str(value).strip().lower() not in _BAD_DISTINCT_IDS


def _distinct_id(event: dict) -> str | None:
    profile_id = event.get("profileId")
    if _is_valid_id(profile_id):
        return profile_id
    device_id = event.get("deviceId")
    if _is_valid_id(device_id):
        return device_id
    return None


def _custom_properties(raw_properties: dict) -> dict:
    return {
        key: value
        for key, value in raw_properties.items()
        if key not in _RESERVED_EVENT_PROPERTY_KEYS
    }


def _utm_properties(raw_properties: dict) -> dict:
    query = raw_properties.get("__query") or {}
    return {key: value for key, value in query.items() if key.startswith("utm_")}


def openpanel_event_to_mixpanel(event: dict) -> tuple[dict | None, str | None]:
    """Map one raw OpenPanel event to a Mixpanel /import record.

    Returns (mixpanel_event, None) on success, or (None, reason) if the
    event can't be mapped (e.g. no usable identity).
    """
    distinct_id = _distinct_id(event)
    if not distinct_id:
        return None, "missing profileId and deviceId"
    if not event.get("createdAt"):
        return None, "missing createdAt"
    if not event.get("id"):
        return None, "missing event id"
    if not event.get("name"):
        return None, "missing event name"

    raw_properties = event.get("properties") or {}
    current_url = None
    if event.get("origin") or event.get("path"):
        current_url = f"{event.get('origin') or ''}{event.get('path') or ''}"

    properties: dict[str, Any] = {
        "time": _to_millis(event["createdAt"]),
        "distinct_id": distinct_id,
        "$insert_id": event["id"],
        "$device_id": event.get("deviceId"),
        "mp_lib": SOURCE_LABEL,
        "$source": SOURCE_LABEL,
        **_custom_properties(raw_properties),
        **_utm_properties(raw_properties),
    }
    if event.get("profileId"):
        properties["$user_id"] = event["profileId"]
    if event.get("os"):
        properties["$os"] = event["os"]
    if event.get("osVersion"):
        properties["$os_version"] = event["osVersion"]
    if event.get("browser"):
        properties["$browser"] = event["browser"]
    if event.get("browserVersion"):
        properties["$browser_version"] = event["browserVersion"]
    if event.get("city"):
        properties["$city"] = event["city"]
    if event.get("region"):
        properties["$region"] = event["region"]
    if event.get("country"):
        properties["mp_country_code"] = event["country"]
    if current_url:
        properties["$current_url"] = current_url
    if event.get("referrer"):
        properties["$referrer"] = event["referrer"]
    if event.get("referrerName"):
        properties["$referring_domain"] = event["referrerName"]
    if event.get("sessionId"):
        properties["session_id"] = event["sessionId"]
    if event.get("duration") is not None:
        properties["duration_ms"] = event["duration"]
    if event.get("revenue") is not None:
        properties["revenue"] = event["revenue"]

    properties = {k: v for k, v in properties.items() if v is not None}
    return {"event": event["name"], "properties": properties}, None


def openpanel_profile_to_mixpanel(profile: dict) -> tuple[dict | None, str | None]:
    """Map one raw OpenPanel profile to a Mixpanel Engage $set record."""
    distinct_id = profile.get("id")
    if not distinct_id:
        return None, "missing profile id"

    set_props: dict[str, Any] = {}
    for source_key, target_key in _PROFILE_FIELD_MAP.items():
        value = profile.get(source_key)
        if value not in (None, ""):
            set_props[target_key] = value
    for key, value in (profile.get("properties") or {}).items():
        set_props.setdefault(key, value)

    if not set_props:
        return None, "no non-empty profile fields"

    return {"$distinct_id": distinct_id, "$set": set_props}, None


def _iter_raw_events(raw_dir: Path) -> Iterator[dict]:
    for path in sorted(raw_dir.glob("*.ndjson")):
        with path.open() as f:
            for line in f:
                line = line.strip()
                if line:
                    yield json.loads(line)


def convert_all(raw_dir: Path, converted_dir: Path, skipped_path: Path) -> dict[str, int]:
    """Convert every raw event under raw_dir into Mixpanel events + profiles.

    Profiles are de-duplicated by id across all events (OpenPanel's export
    attaches a `profile` snapshot per-event, there's no standalone profile
    list endpoint); files are processed in filename order (which is
    chronological, per the `<window-start>_<window-end>.ndjson` naming from
    export_range), so later snapshots overwrite earlier ones.
    """
    converted_dir.mkdir(parents=True, exist_ok=True)
    skipped_path.parent.mkdir(parents=True, exist_ok=True)

    profiles_by_id: dict[str, dict] = {}
    event_count = skipped_count = 0

    with (converted_dir / "events.ndjson").open("w") as events_out, skipped_path.open(
        "w"
    ) as skipped_out:
        for raw_event in _iter_raw_events(raw_dir):
            mixpanel_event, reason = openpanel_event_to_mixpanel(raw_event)
            if mixpanel_event is None:
                skipped_out.write(
                    json.dumps({"kind": "event", "reason": reason, "raw": raw_event}) + "\n"
                )
                skipped_count += 1
            else:
                events_out.write(json.dumps(mixpanel_event) + "\n")
                event_count += 1

            profile = raw_event.get("profile")
            if profile and profile.get("id"):
                profiles_by_id[profile["id"]] = profile

    profile_count = 0
    with (converted_dir / "profiles.ndjson").open("w") as profiles_out, skipped_path.open(
        "a"
    ) as skipped_out:
        for profile in profiles_by_id.values():
            mixpanel_profile, reason = openpanel_profile_to_mixpanel(profile)
            if mixpanel_profile is None:
                skipped_out.write(
                    json.dumps({"kind": "profile", "reason": reason, "raw": profile}) + "\n"
                )
                skipped_count += 1
            else:
                profiles_out.write(json.dumps(mixpanel_profile) + "\n")
                profile_count += 1

    return {"events": event_count, "profiles": profile_count, "skipped": skipped_count}
